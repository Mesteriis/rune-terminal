package conversation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	defaultCodexCLICommand      = "codex"
	defaultCodexCLIModel        = "gpt-5.4"
	defaultClaudeCodeCommand    = "claude"
	defaultClaudeCodeModel      = "sonnet"
	defaultCLICompletionTimeout = 2 * time.Minute
)

type CodexCLIProviderConfig struct {
	Command string
	Model   string
}

type ClaudeCodeProviderConfig struct {
	Command string
	Model   string
}

type localCLIProvider struct {
	kind    string
	command string
	model   string
	mode    localCLIMode
}

type localCLIMode string

const (
	localCLIModeCodex      localCLIMode = "codex"
	localCLIModeClaudeCode localCLIMode = "claude-code"
)

func NewCodexCLIProvider(config CodexCLIProviderConfig) *localCLIProvider {
	return &localCLIProvider{
		kind:    "codex",
		command: strings.TrimSpace(firstNonEmptyString(config.Command, defaultCodexCLICommand)),
		model:   strings.TrimSpace(firstNonEmptyString(config.Model, defaultCodexCLIModel)),
		mode:    localCLIModeCodex,
	}
}

func NewClaudeCodeProvider(config ClaudeCodeProviderConfig) *localCLIProvider {
	return &localCLIProvider{
		kind:    "claude",
		command: strings.TrimSpace(firstNonEmptyString(config.Command, defaultClaudeCodeCommand)),
		model:   strings.TrimSpace(firstNonEmptyString(config.Model, defaultClaudeCodeModel)),
		mode:    localCLIModeClaudeCode,
	}
}

func ListCodexCLIModels(model string, configuredModels []string) []string {
	return compactModelIDs(append(
		[]string{
			firstNonEmptyString(model, defaultCodexCLIModel),
			"gpt-5.4",
			"gpt-5-codex",
		},
		configuredModels...,
	))
}

func ListClaudeCodeModels(model string, configuredModels []string) []string {
	return compactModelIDs(append(
		[]string{firstNonEmptyString(model, defaultClaudeCodeModel), "opus"},
		configuredModels...,
	))
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func compactModelIDs(models []string) []string {
	compact := make([]string, 0, len(models))
	seen := make(map[string]struct{}, len(models))

	for _, rawModel := range models {
		model := strings.TrimSpace(rawModel)
		if model == "" {
			continue
		}
		if _, ok := seen[model]; ok {
			continue
		}
		seen[model] = struct{}{}
		compact = append(compact, model)
	}
	return compact
}

func (p *localCLIProvider) Info() ProviderInfo {
	return ProviderInfo{
		Kind:      p.kind,
		Model:     p.model,
		Streaming: true,
	}
}

func (p *localCLIProvider) Complete(ctx context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error) {
	return p.complete(ctx, request, nil)
}

func (p *localCLIProvider) CompleteStream(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	return p.CompleteStructuredStream(ctx, request, func(event ProviderStreamEvent) error {
		if onTextDelta == nil || event.Type != ProviderStreamEventTextDelta || event.Delta == "" {
			return nil
		}
		return onTextDelta(event.Delta)
	})
}

func (p *localCLIProvider) CompleteStructuredStream(
	ctx context.Context,
	request CompletionRequest,
	emit func(ProviderStreamEvent) error,
) (CompletionResult, ProviderInfo, error) {
	return p.completeStructured(ctx, request, emit)
}

func (p *localCLIProvider) complete(
	ctx context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	info := p.Info()
	if model := strings.TrimSpace(request.Model); model != "" {
		info.Model = model
	}
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, info, err
	}
	if strings.TrimSpace(p.command) == "" {
		return CompletionResult{}, info, fmt.Errorf("%s command is required", p.kind)
	}

	content, reasoning, session, err := p.run(ctx, request, info.Model)
	if err != nil {
		return CompletionResult{Session: session}, info, err
	}
	content = strings.TrimSpace(content)
	if onTextDelta != nil && content != "" {
		if err := onTextDelta(content); err != nil {
			return CompletionResult{}, info, err
		}
	}
	return CompletionResult{
		Content:   content,
		Reasoning: strings.TrimSpace(reasoning),
		Model:     info.Model,
		Session:   session,
	}, info, nil
}

func (p *localCLIProvider) completeStructured(
	ctx context.Context,
	request CompletionRequest,
	emit func(ProviderStreamEvent) error,
) (CompletionResult, ProviderInfo, error) {
	info := p.Info()
	if model := strings.TrimSpace(request.Model); model != "" {
		info.Model = model
	}
	if err := validateCompletionRequest(request); err != nil {
		return CompletionResult{}, info, err
	}
	if strings.TrimSpace(p.command) == "" {
		return CompletionResult{}, info, fmt.Errorf("%s command is required", p.kind)
	}

	content, reasoning, session, err := p.runStructured(ctx, request, info.Model, emit)
	if err != nil {
		return CompletionResult{Session: session}, info, err
	}
	return CompletionResult{
		Content:   strings.TrimSpace(content),
		Reasoning: strings.TrimSpace(reasoning),
		Model:     info.Model,
		Session:   session,
	}, info, nil
}

func (p *localCLIProvider) run(ctx context.Context, request CompletionRequest, model string) (string, string, *ProviderSessionState, error) {
	switch p.mode {
	case localCLIModeCodex:
		content, session, err := runCodexCLI(ctx, p.command, model, request.Session, formatCLICompletionPrompt(request, true))
		return content, formatCLIReasoning("codex", p.command, model, err == nil), session, err
	case localCLIModeClaudeCode:
		content, session, err := runClaudeCodeCLI(
			ctx,
			p.command,
			model,
			request.SystemPrompt,
			formatCLICompletionPrompt(request, false),
			request.Session,
		)
		return content, formatCLIReasoning("claude", p.command, model, err == nil), session, err
	default:
		return "", "", nil, fmt.Errorf("unsupported cli provider mode: %s", p.mode)
	}
}

func (p *localCLIProvider) runStructured(
	ctx context.Context,
	request CompletionRequest,
	model string,
	emit func(ProviderStreamEvent) error,
) (string, string, *ProviderSessionState, error) {
	switch p.mode {
	case localCLIModeCodex:
		content, reasoning, session, err := runCodexCLIStream(
			ctx,
			p.command,
			model,
			request.Session,
			formatCLICompletionPrompt(request, true),
			emit,
		)
		if strings.TrimSpace(reasoning) == "" {
			reasoning = formatCLIReasoning("codex", p.command, model, err == nil)
		}
		return content, reasoning, session, err
	case localCLIModeClaudeCode:
		content, reasoning, session, err := runClaudeCodeCLIStream(
			ctx,
			p.command,
			model,
			request.SystemPrompt,
			formatCLICompletionPrompt(request, false),
			request.Session,
			emit,
		)
		if strings.TrimSpace(reasoning) == "" {
			reasoning = formatCLIReasoning("claude", p.command, model, err == nil)
		}
		return content, reasoning, session, err
	default:
		return "", "", nil, fmt.Errorf("unsupported cli provider mode: %s", p.mode)
	}
}

func runCodexCLI(
	ctx context.Context,
	command string,
	model string,
	session *ProviderSessionState,
	prompt string,
) (string, *ProviderSessionState, error) {
	outputFile, err := os.CreateTemp("", "rterm-codex-last-message-*.txt")
	if err != nil {
		return "", nil, err
	}
	outputPath := outputFile.Name()
	if err := outputFile.Close(); err != nil {
		return "", nil, err
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

	stdout, stderr, err := runLocalCLICommand(ctx, command, args, stdin)
	if err != nil {
		return "", nil, formatCLICommandError("codex", err, stdout, stderr)
	}
	nextSession := session
	if threadID := extractCodexThreadID(stdout); threadID != "" {
		nextSession = &ProviderSessionState{ProviderKind: "codex", ID: threadID}
	} else if sessionID != "" {
		nextSession = &ProviderSessionState{ProviderKind: "codex", ID: sessionID}
	}
	if payload, readErr := os.ReadFile(outputPath); readErr == nil && strings.TrimSpace(string(payload)) != "" {
		return string(payload), nextSession, nil
	}
	return stdout, nextSession, nil
}

func runClaudeCodeCLI(
	ctx context.Context,
	command string,
	model string,
	systemPrompt string,
	prompt string,
	session *ProviderSessionState,
) (string, *ProviderSessionState, error) {
	sessionID := ""
	if session != nil {
		sessionID = strings.TrimSpace(session.ID)
	}
	if sessionID == "" {
		sessionID = uuid.NewString()
	}

	args := []string{
		"-p",
		"--output-format", "text",
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

	stdout, stderr, err := runLocalCLICommand(ctx, command, args, "")
	if err != nil {
		return "", nil, formatCLICommandError("claude", err, stdout, stderr)
	}
	return stdout, &ProviderSessionState{ProviderKind: "claude", ID: sessionID}, nil
}

func formatCLIReasoning(label, command, model string, completed bool) string {
	status := "completed"
	if !completed {
		status = "failed"
	}
	commandLine := strings.TrimSpace(command)
	if commandLine == "" {
		commandLine = label
	}
	normalizedModel := strings.TrimSpace(model)
	if normalizedModel == "" {
		normalizedModel = "default"
	}
	return fmt.Sprintf("%s via CLI command %q (model=%s) %s", label, commandLine, normalizedModel, status)
}

func runLocalCLICommand(ctx context.Context, command string, args []string, stdin string) (string, string, error) {
	resolvedCommand, err := exec.LookPath(strings.TrimSpace(command))
	if err != nil {
		return "", "", err
	}

	runCtx := ctx
	cancel := func() {}
	if _, ok := ctx.Deadline(); !ok {
		runCtx, cancel = context.WithTimeout(ctx, defaultCLICompletionTimeout)
	}
	defer cancel()

	cmd := exec.CommandContext(runCtx, resolvedCommand, args...)
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}
	cmd.Env = append(os.Environ(), "NO_COLOR=1")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if cause := context.Cause(runCtx); cause != nil {
		return stdout.String(), stderr.String(), cause
	}
	if runCtx.Err() != nil {
		return stdout.String(), stderr.String(), runCtx.Err()
	}
	return stdout.String(), stderr.String(), err
}

func formatCLICompletionPrompt(request CompletionRequest, includeSystem bool) string {
	var builder strings.Builder
	if includeSystem {
		builder.WriteString("System instructions:\n")
		builder.WriteString(strings.TrimSpace(request.SystemPrompt))
		builder.WriteString("\n\n")
	}
	builder.WriteString("Conversation transcript:\n")
	for _, message := range request.Messages {
		content := strings.TrimSpace(message.Content)
		if content == "" {
			continue
		}
		builder.WriteString(strings.ToUpper(string(message.Role)))
		builder.WriteString(":\n")
		builder.WriteString(content)
		builder.WriteString("\n\n")
	}
	builder.WriteString("Reply to the final USER message only. Keep the answer concise and actionable.")
	return builder.String()
}

func formatCLICommandError(label string, err error, stdout string, stderr string) error {
	detail := strings.TrimSpace(stderr)
	if detail == "" {
		detail = strings.TrimSpace(stdout)
	}
	if detail == "" {
		return fmt.Errorf("%s cli failed: %w", label, err)
	}
	return fmt.Errorf("%s cli failed: %w: %s", label, err, detail)
}

func extractCodexThreadID(stdout string) string {
	for _, line := range strings.Split(stdout, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var payload struct {
			ThreadID string `json:"thread_id"`
		}
		if err := json.Unmarshal([]byte(line), &payload); err != nil {
			continue
		}
		if strings.TrimSpace(payload.ThreadID) != "" {
			return strings.TrimSpace(payload.ThreadID)
		}
	}
	return ""
}
