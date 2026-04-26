package conversation

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"

	"github.com/google/uuid"
)

type commandStreamCollector struct {
	mu       sync.Mutex
	firstErr error
}

func (c *commandStreamCollector) set(err error, cancel context.CancelCauseFunc) {
	if err == nil || errors.Is(err, io.EOF) {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.firstErr != nil {
		return
	}
	c.firstErr = err
	cancel(err)
}

func (c *commandStreamCollector) err() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.firstErr
}

func runStreamingLocalCLICommand(
	ctx context.Context,
	command string,
	args []string,
	stdin string,
	onStdoutLine func(string) error,
) (string, string, error) {
	resolvedCommand, err := exec.LookPath(strings.TrimSpace(command))
	if err != nil {
		return "", "", err
	}

	runCtx := ctx
	cancelTimeout := func() {}
	if _, ok := ctx.Deadline(); !ok {
		runCtx, cancelTimeout = context.WithTimeout(ctx, defaultCLICompletionTimeout)
	}
	defer cancelTimeout()

	streamCtx, cancelStream := context.WithCancelCause(runCtx)
	defer cancelStream(nil)

	cmd := exec.CommandContext(streamCtx, resolvedCommand, args...)
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}
	cmd.Env = append(os.Environ(), "NO_COLOR=1")

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", "", err
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return "", "", err
	}

	if err := cmd.Start(); err != nil {
		return "", "", err
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	collector := &commandStreamCollector{}
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		readStreamingCommandLines(stdoutPipe, &stdout, onStdoutLine, collector, cancelStream)
	}()
	go func() {
		defer wg.Done()
		readStreamingCommandLines(stderrPipe, &stderr, nil, collector, cancelStream)
	}()

	waitErr := cmd.Wait()
	wg.Wait()

	if cause := context.Cause(runCtx); cause != nil {
		return stdout.String(), stderr.String(), cause
	}
	if streamErr := collector.err(); streamErr != nil {
		return stdout.String(), stderr.String(), streamErr
	}
	if runCtx.Err() != nil {
		return stdout.String(), stderr.String(), runCtx.Err()
	}
	return stdout.String(), stderr.String(), waitErr
}

func readStreamingCommandLines(
	reader io.Reader,
	raw *bytes.Buffer,
	onLine func(string) error,
	collector *commandStreamCollector,
	cancel context.CancelCauseFunc,
) {
	buffered := bufio.NewReader(reader)
	for {
		line, err := buffered.ReadString('\n')
		if len(line) > 0 {
			raw.WriteString(line)
			if onLine != nil {
				if callbackErr := onLine(strings.TrimRight(line, "\r\n")); callbackErr != nil {
					collector.set(callbackErr, cancel)
					return
				}
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return
			}
			collector.set(err, cancel)
			return
		}
	}
}

type codexCLIJSONLine struct {
	Type     string `json:"type"`
	ThreadID string `json:"thread_id"`
	Delta    string `json:"delta"`
	Text     string `json:"text"`
	Message  string `json:"message"`
	Error    *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
	Item *struct {
		ID               string `json:"id"`
		Type             string `json:"type"`
		Text             string `json:"text"`
		Message          string `json:"message"`
		Command          string `json:"command"`
		AggregatedOutput string `json:"aggregated_output"`
		Status           string `json:"status"`
		ExitCode         *int   `json:"exit_code"`
	} `json:"item,omitempty"`
}

func runCodexCLIStream(
	ctx context.Context,
	command string,
	model string,
	session *ProviderSessionState,
	prompt string,
	emit func(ProviderStreamEvent) error,
) (string, string, *ProviderSessionState, error) {
	outputFile, err := os.CreateTemp("", "rterm-codex-last-message-*.txt")
	if err != nil {
		return "", "", nil, err
	}
	outputPath := outputFile.Name()
	if err := outputFile.Close(); err != nil {
		return "", "", nil, err
	}
	defer os.Remove(outputPath)

	args := []string{
		"exec",
		"--color", "never",
		"--sandbox", "read-only",
		"--skip-git-repo-check",
		"--json",
		"--output-last-message", outputPath,
	}
	if strings.TrimSpace(model) != "" {
		args = append(args, "--model", strings.TrimSpace(model))
	}
	stdin := prompt
	sessionID := ""
	if session != nil {
		sessionID = strings.TrimSpace(session.ID)
	}
	if sessionID != "" {
		args = append(args, "resume", sessionID, prompt)
		stdin = ""
	} else {
		args = append(args, "-")
	}

	var textBuilder strings.Builder
	var reasoningBuilder strings.Builder
	resolvedSessionID := sessionID
	textStreamed := false
	var providerErr error

	stdout, stderr, runErr := runStreamingLocalCLICommand(ctx, command, args, stdin, func(line string) error {
		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "{") {
			return nil
		}

		var payload codexCLIJSONLine
		if err := json.Unmarshal([]byte(line), &payload); err != nil {
			return nil
		}

		switch strings.TrimSpace(payload.Type) {
		case "thread.started":
			if threadID := strings.TrimSpace(payload.ThreadID); threadID != "" {
				resolvedSessionID = threadID
			}
		case "agent_message_delta":
			delta := firstNonEmptyString(payload.Delta, payload.Text)
			if strings.TrimSpace(delta) == "" {
				return nil
			}
			textStreamed = true
			textBuilder.WriteString(delta)
			return emitProviderTextDelta(emit, delta)
		case "item.started":
			if payload.Item == nil || strings.TrimSpace(payload.Item.Type) != "command_execution" {
				return nil
			}
			return emitProviderToolCall(emit, &ProviderStreamToolCall{
				ID:      strings.TrimSpace(payload.Item.ID),
				Kind:    "command_execution",
				Name:    "command_execution",
				Status:  normalizeToolCallStatus(payload.Item.Status, "in_progress"),
				Summary: strings.TrimSpace(payload.Item.Command),
				Input:   strings.TrimSpace(payload.Item.Command),
			})
		case "item.completed":
			if payload.Item == nil {
				return nil
			}
			switch strings.TrimSpace(payload.Item.Type) {
			case "agent_message":
				text := firstNonEmptyString(payload.Item.Text, payload.Text)
				if text == "" {
					return nil
				}
				if !textStreamed {
					textBuilder.WriteString(text)
					if err := emitProviderTextDelta(emit, text); err != nil {
						return err
					}
				}
			case "reasoning":
				reasoning := firstNonEmptyString(payload.Item.Text, payload.Text)
				if reasoning == "" {
					return nil
				}
				appendReasoningDelta(&reasoningBuilder, reasoning)
				return emitProviderReasoningDelta(emit, reasoning)
			case "command_execution":
				status := normalizeToolCallStatus(payload.Item.Status, "completed")
				if payload.Item.ExitCode != nil && *payload.Item.ExitCode != 0 {
					status = "failed"
				}
				return emitProviderToolCall(emit, &ProviderStreamToolCall{
					ID:       strings.TrimSpace(payload.Item.ID),
					Kind:     "command_execution",
					Name:     "command_execution",
					Status:   status,
					Summary:  strings.TrimSpace(payload.Item.Command),
					Input:    strings.TrimSpace(payload.Item.Command),
					Output:   strings.TrimSpace(payload.Item.AggregatedOutput),
					ExitCode: payload.Item.ExitCode,
				})
			case "error":
				message := firstNonEmptyString(payload.Item.Message, payload.Message)
				if strings.TrimSpace(message) != "" {
					providerErr = errors.New(strings.TrimSpace(message))
				}
			}
		case "turn.failed", "error":
			message := strings.TrimSpace(payload.Message)
			if payload.Error != nil && strings.TrimSpace(payload.Error.Message) != "" {
				message = strings.TrimSpace(payload.Error.Message)
			}
			if message != "" {
				providerErr = errors.New(message)
			}
		}
		return nil
	})
	if runErr != nil {
		return "", strings.TrimSpace(reasoningBuilder.String()), nextCLISessionState("codex", resolvedSessionID), formatCLICommandError("codex", runErr, stdout, stderr)
	}
	if providerErr != nil {
		return "", strings.TrimSpace(reasoningBuilder.String()), nextCLISessionState("codex", resolvedSessionID), providerErr
	}

	finalContent := strings.TrimSpace(readCLIOutputFile(outputPath))
	if finalContent == "" {
		finalContent = strings.TrimSpace(textBuilder.String())
	}
	return finalContent, strings.TrimSpace(reasoningBuilder.String()), nextCLISessionState("codex", resolvedSessionID), nil
}

type claudeCodeStreamJSONLine struct {
	Type      string `json:"type"`
	Subtype   string `json:"subtype"`
	SessionID string `json:"session_id"`
	Result    string `json:"result"`
	IsError   bool   `json:"is_error"`
	Message   string `json:"message"`
	Event     *struct {
		Type         string `json:"type"`
		Index        int    `json:"index"`
		ContentBlock *struct {
			Type  string          `json:"type"`
			ID    string          `json:"id"`
			Name  string          `json:"name"`
			Input json.RawMessage `json:"input"`
		} `json:"content_block,omitempty"`
		Delta *struct {
			Type        string `json:"type"`
			Text        string `json:"text"`
			PartialJSON string `json:"partial_json"`
		} `json:"delta,omitempty"`
	} `json:"event,omitempty"`
}

type claudeToolUseState struct {
	ID           string
	Name         string
	InputBuilder strings.Builder
}

func runClaudeCodeCLIStream(
	ctx context.Context,
	command string,
	model string,
	systemPrompt string,
	prompt string,
	session *ProviderSessionState,
	emit func(ProviderStreamEvent) error,
) (string, string, *ProviderSessionState, error) {
	sessionID := ""
	if session != nil {
		sessionID = strings.TrimSpace(session.ID)
	}
	if sessionID == "" {
		sessionID = uuid.NewString()
	}

	args := []string{
		"-p",
		"--output-format", "stream-json",
		"--verbose",
		"--include-partial-messages",
		"--tools", "",
		"--session-id", sessionID,
	}
	if strings.TrimSpace(model) != "" {
		args = append(args, "--model", strings.TrimSpace(model))
	}
	if strings.TrimSpace(systemPrompt) != "" {
		args = append(args, "--system-prompt", strings.TrimSpace(systemPrompt))
	}
	args = append(args, prompt)

	var textBuilder strings.Builder
	resolvedSessionID := sessionID
	toolUses := map[int]*claudeToolUseState{}
	var providerErr error

	stdout, stderr, runErr := runStreamingLocalCLICommand(ctx, command, args, "", func(line string) error {
		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "{") {
			return nil
		}

		var payload claudeCodeStreamJSONLine
		if err := json.Unmarshal([]byte(line), &payload); err != nil {
			return nil
		}
		if strings.TrimSpace(payload.SessionID) != "" {
			resolvedSessionID = strings.TrimSpace(payload.SessionID)
		}
		switch strings.TrimSpace(payload.Type) {
		case "stream_event":
			if payload.Event == nil {
				return nil
			}
			switch strings.TrimSpace(payload.Event.Type) {
			case "content_block_delta":
				if payload.Event.Delta == nil {
					return nil
				}
				switch strings.TrimSpace(payload.Event.Delta.Type) {
				case "text_delta":
					if strings.TrimSpace(payload.Event.Delta.Text) == "" {
						return nil
					}
					textBuilder.WriteString(payload.Event.Delta.Text)
					return emitProviderTextDelta(emit, payload.Event.Delta.Text)
				case "input_json_delta":
					toolUse := toolUses[payload.Event.Index]
					if toolUse == nil {
						return nil
					}
					toolUse.InputBuilder.WriteString(payload.Event.Delta.PartialJSON)
				}
			case "content_block_start":
				if payload.Event.ContentBlock == nil {
					return nil
				}
				if strings.TrimSpace(payload.Event.ContentBlock.Type) != "tool_use" {
					return nil
				}
				toolUse := &claudeToolUseState{
					ID:   strings.TrimSpace(payload.Event.ContentBlock.ID),
					Name: strings.TrimSpace(payload.Event.ContentBlock.Name),
				}
				if len(payload.Event.ContentBlock.Input) > 0 {
					toolUse.InputBuilder.Write(payload.Event.ContentBlock.Input)
				}
				toolUses[payload.Event.Index] = toolUse
				return emitProviderToolCall(emit, &ProviderStreamToolCall{
					ID:      toolUse.ID,
					Kind:    "tool_use",
					Name:    firstNonEmptyString(toolUse.Name, "tool_use"),
					Status:  "in_progress",
					Summary: firstNonEmptyString(toolUse.Name, "tool_use"),
					Input:   strings.TrimSpace(toolUse.InputBuilder.String()),
				})
			case "content_block_stop":
				toolUse := toolUses[payload.Event.Index]
				if toolUse == nil {
					return nil
				}
				delete(toolUses, payload.Event.Index)
				return emitProviderToolCall(emit, &ProviderStreamToolCall{
					ID:      toolUse.ID,
					Kind:    "tool_use",
					Name:    firstNonEmptyString(toolUse.Name, "tool_use"),
					Status:  "completed",
					Summary: firstNonEmptyString(toolUse.Name, "tool_use"),
					Input:   strings.TrimSpace(toolUse.InputBuilder.String()),
				})
			}
		case "result":
			if payload.IsError || strings.EqualFold(strings.TrimSpace(payload.Subtype), "error") {
				message := strings.TrimSpace(payload.Result)
				if message == "" {
					message = strings.TrimSpace(payload.Message)
				}
				if message == "" {
					message = "claude cli stream failed"
				}
				providerErr = errors.New(message)
			}
			if strings.TrimSpace(payload.Result) != "" && textBuilder.Len() == 0 {
				textBuilder.WriteString(strings.TrimSpace(payload.Result))
				if err := emitProviderTextDelta(emit, strings.TrimSpace(payload.Result)); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if runErr != nil {
		return "", "", nextCLISessionState("claude", resolvedSessionID), formatCLICommandError("claude", runErr, stdout, stderr)
	}
	if providerErr != nil {
		return "", "", nextCLISessionState("claude", resolvedSessionID), providerErr
	}

	return strings.TrimSpace(textBuilder.String()), "", nextCLISessionState("claude", resolvedSessionID), nil
}

func appendReasoningDelta(builder *strings.Builder, delta string) {
	delta = strings.TrimSpace(delta)
	if delta == "" {
		return
	}
	if builder.Len() > 0 {
		builder.WriteString("\n\n")
	}
	builder.WriteString(delta)
}

func emitProviderTextDelta(emit func(ProviderStreamEvent) error, delta string) error {
	if emit == nil || delta == "" {
		return nil
	}
	return emit(ProviderStreamEvent{
		Type:  ProviderStreamEventTextDelta,
		Delta: delta,
	})
}

func emitProviderReasoningDelta(emit func(ProviderStreamEvent) error, delta string) error {
	if emit == nil || delta == "" {
		return nil
	}
	return emit(ProviderStreamEvent{
		Type:  ProviderStreamEventReasoningDelta,
		Delta: delta,
	})
}

func emitProviderToolCall(emit func(ProviderStreamEvent) error, toolCall *ProviderStreamToolCall) error {
	if emit == nil || toolCall == nil {
		return nil
	}
	return emit(ProviderStreamEvent{
		Type:     ProviderStreamEventToolCall,
		ToolCall: toolCall,
	})
}

func normalizeToolCallStatus(raw string, fallback string) string {
	status := strings.TrimSpace(raw)
	if status == "" {
		return fallback
	}
	return status
}

func nextCLISessionState(providerKind string, sessionID string) *ProviderSessionState {
	if strings.TrimSpace(sessionID) == "" {
		return nil
	}
	return &ProviderSessionState{
		ProviderKind: providerKind,
		ID:           strings.TrimSpace(sessionID),
	}
}

func readCLIOutputFile(path string) string {
	payload, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(payload)
}
