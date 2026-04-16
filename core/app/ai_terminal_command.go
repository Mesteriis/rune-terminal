package app

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/terminal"
)

type ExplainTerminalCommandRequest struct {
	Prompt              string `json:"prompt"`
	Command             string `json:"command"`
	WidgetID            string `json:"widget_id,omitempty"`
	FromSeq             uint64 `json:"from_seq,omitempty"`
	CommandAuditEventID string `json:"command_audit_event_id,omitempty"`
}

type ExplainTerminalCommandResult struct {
	Snapshot      conversation.Snapshot `json:"snapshot"`
	ProviderError string                `json:"provider_error,omitempty"`
	OutputExcerpt string                `json:"output_excerpt,omitempty"`
}

var ansiCSIPattern = regexp.MustCompile(`\x1b\[[0-?]*[ -/]*[@-~]`)

const explainAuditScanLimit = 64
const runCommandOutputEmptyMessage = "No terminal output was captured yet."

func (r *Runtime) ExplainTerminalCommand(
	ctx context.Context,
	request ExplainTerminalCommandRequest,
	conversationContext ConversationContext,
) (ExplainTerminalCommandResult, error) {
	prompt := strings.TrimSpace(request.Prompt)
	command := strings.TrimSpace(request.Command)
	if prompt == "" || command == "" {
		return ExplainTerminalCommandResult{}, conversation.ErrInvalidPrompt
	}

	widgetID, err := r.resolveWidgetID(firstNonEmpty(request.WidgetID, conversationContext.ActiveWidgetID))
	if err != nil {
		return ExplainTerminalCommandResult{}, err
	}
	snapshot, err := r.Terminals.Snapshot(widgetID, request.FromSeq)
	if err != nil {
		return ExplainTerminalCommandResult{}, err
	}
	outputExcerpt := summarizeTerminalOutput(command, snapshot.Chunks)
	approvalUsed := r.deriveExplainApprovalUsed(
		widgetID,
		command,
		request.CommandAuditEventID,
		conversationContext.WorkspaceID,
	)

	if err := r.persistRunTranscriptActivity(prompt, command, outputExcerpt); err != nil {
		return ExplainTerminalCommandResult{}, err
	}

	selection, err := r.Agent.Selection()
	if err != nil {
		return ExplainTerminalCommandResult{}, err
	}

	systemPrompt := strings.TrimSpace(selection.EffectivePrompt() + "\n\n" + buildConversationContextBlock(r, conversationContext))
	result, err := r.Conversation.AppendAssistantPrompt(ctx, conversation.AssistantPromptRequest{
		SystemPrompt: systemPrompt,
		Prompt:       buildTerminalExplanationPrompt(prompt, command, outputExcerpt),
	})
	if err != nil {
		return ExplainTerminalCommandResult{}, err
	}

	profile := selection.EffectivePolicyProfile()
	providerFailed := result.ProviderError != ""
	targetSession := terminalSessionTarget(snapshot.State.ConnectionKind)
	targetConnectionID := snapshot.State.ConnectionID
	if targetConnectionID == "" && targetSession == "local" {
		targetConnectionID = "local"
	}
	if appendErr := r.Audit.Append(audit.Event{
		ToolName:           "agent.terminal_command",
		Summary:            fmt.Sprintf("explain terminal command: %s", trimSummary(command)),
		WorkspaceID:        conversationContext.WorkspaceID,
		PromptProfileID:    profile.PromptProfileID,
		RoleID:             profile.RoleID,
		ModeID:             profile.ModeID,
		SecurityPosture:    profile.SecurityPosture,
		AffectedWidgets:    affectedWidgets(widgetID),
		ApprovalUsed:       approvalUsed,
		ActionSource:       conversationContext.ActionSource,
		TargetSession:      targetSession,
		TargetConnectionID: targetConnectionID,
		Success:            !providerFailed,
		Error:              result.ProviderError,
	}); appendErr != nil {
		return ExplainTerminalCommandResult{}, appendErr
	}

	return ExplainTerminalCommandResult{
		Snapshot:      result.Snapshot,
		ProviderError: result.ProviderError,
		OutputExcerpt: outputExcerpt,
	}, nil
}

func (r *Runtime) persistRunTranscriptActivity(prompt string, command string, outputExcerpt string) error {
	resultMessage := buildRunExecutionResultMessage(command, outputExcerpt)
	if shouldSkipRunTranscriptAppend(r.Conversation.Snapshot().Messages, prompt, resultMessage) {
		return nil
	}
	_, err := r.Conversation.AppendMessages([]conversation.AppendMessageRequest{
		{
			Role:    conversation.RoleUser,
			Content: prompt,
			Status:  conversation.StatusComplete,
		},
		{
			Role:    conversation.RoleAssistant,
			Content: resultMessage,
			Status:  conversation.StatusComplete,
		},
	})
	return err
}

func shouldSkipRunTranscriptAppend(messages []conversation.Message, prompt string, resultMessage string) bool {
	if len(messages) < 2 {
		return false
	}
	if messageMatchesRunActivity(messages[len(messages)-2], conversation.RoleUser, prompt) &&
		messageMatchesRunActivity(messages[len(messages)-1], conversation.RoleAssistant, resultMessage) {
		return true
	}
	if len(messages) >= 3 &&
		messageMatchesRunActivity(messages[len(messages)-3], conversation.RoleUser, prompt) &&
		messageMatchesRunActivity(messages[len(messages)-2], conversation.RoleAssistant, resultMessage) {
		return true
	}
	return false
}

func messageMatchesRunActivity(message conversation.Message, role conversation.MessageRole, content string) bool {
	return message.Role == role && strings.TrimSpace(message.Content) == strings.TrimSpace(content)
}

func buildRunExecutionResultMessage(command string, outputExcerpt string) string {
	trimmedCommand := strings.TrimSpace(command)
	if strings.TrimSpace(outputExcerpt) == "" {
		return fmt.Sprintf("Executed `%s`.\n\n%s", trimmedCommand, runCommandOutputEmptyMessage)
	}
	return fmt.Sprintf("Executed `%s`.\n\n```text\n%s\n```", trimmedCommand, sanitizeCodeFenceContent(outputExcerpt))
}

func sanitizeCodeFenceContent(value string) string {
	return strings.ReplaceAll(value, "```", "``\\`")
}

func (r *Runtime) deriveExplainApprovalUsed(widgetID string, command string, commandAuditEventID string, workspaceID string) bool {
	events, err := r.Audit.List(explainAuditScanLimit)
	if err != nil {
		return false
	}
	expectedSummary := fmt.Sprintf("send input to %s: %s", widgetID, trimSummary(command))
	trimmedWorkspaceID := strings.TrimSpace(workspaceID)
	trimmedEventID := strings.TrimSpace(commandAuditEventID)
	if trimmedEventID != "" {
		for i := len(events) - 1; i >= 0; i-- {
			event := events[i]
			if event.ID != trimmedEventID {
				continue
			}
			if !matchesExplainCommandEvent(event, widgetID, expectedSummary, trimmedWorkspaceID) {
				return false
			}
			return event.ApprovalUsed
		}
		return false
	}
	for i := len(events) - 1; i >= 0; i-- {
		event := events[i]
		if !matchesExplainCommandEvent(event, widgetID, expectedSummary, trimmedWorkspaceID) {
			continue
		}
		return event.ApprovalUsed
	}
	return false
}

func matchesExplainCommandEvent(event audit.Event, widgetID string, expectedSummary string, workspaceID string) bool {
	if event.ToolName != "term.send_input" || !event.Success {
		return false
	}
	if event.Summary != expectedSummary {
		return false
	}
	if workspaceID != "" && event.WorkspaceID != workspaceID {
		return false
	}
	return containsString(event.AffectedWidgets, widgetID)
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func terminalSessionTarget(connectionKind string) string {
	if connectionKind == "ssh" {
		return "remote"
	}
	return "local"
}

func buildTerminalExplanationPrompt(prompt string, command string, outputExcerpt string) string {
	if outputExcerpt == "" {
		outputExcerpt = "No terminal output was captured yet."
	}
	return strings.TrimSpace(fmt.Sprintf(`A user asked to run a terminal command.

Original request:
%s

Executed command:
%s

Terminal output:
%s

Write a concise assistant reply that:
- says what command was run
- summarizes the observed result
- points out obvious errors or warnings if present
- stays brief and practical`, prompt, command, outputExcerpt))
}

func summarizeTerminalOutput(command string, chunks []terminal.OutputChunk) string {
	if len(chunks) == 0 {
		return ""
	}
	var builder strings.Builder
	for _, chunk := range chunks {
		builder.WriteString(chunk.Data)
		if builder.Len() >= 8192 {
			break
		}
	}
	output := normalizeTerminalOutput(command, builder.String())
	if len(output) > 4000 {
		output = output[len(output)-4000:]
	}
	return output
}

func normalizeTerminalOutput(command string, output string) string {
	normalized := strings.ReplaceAll(applyTerminalBackspaces(output), "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	normalized = ansiCSIPattern.ReplaceAllString(normalized, "")
	normalized = strings.ReplaceAll(normalized, "\x1b", "")
	lines := strings.Split(normalized, "\n")
	cleaned := make([]string, 0, len(lines))
	trimmedCommand := strings.TrimSpace(command)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if line == "%" || strings.HasPrefix(line, "╭") || strings.HasPrefix(line, "╰") {
			continue
		}
		if line == trimmedCommand {
			continue
		}
		if trimmedCommand != "" && (strings.HasPrefix(trimmedCommand, line) || strings.HasPrefix(line, trimmedCommand)) {
			continue
		}
		cleaned = append(cleaned, line)
	}
	return strings.TrimSpace(strings.Join(cleaned, "\n"))
}

func applyTerminalBackspaces(value string) string {
	runes := make([]rune, 0, len(value))
	for _, r := range value {
		if r == '\b' {
			if len(runes) > 0 {
				runes = runes[:len(runes)-1]
			}
			continue
		}
		runes = append(runes, r)
	}
	return string(runes)
}
