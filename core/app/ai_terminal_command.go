package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/terminal"
)

type ExplainTerminalCommandRequest struct {
	Prompt       string `json:"prompt"`
	Command      string `json:"command"`
	WidgetID     string `json:"widget_id,omitempty"`
	FromSeq      uint64 `json:"from_seq,omitempty"`
	ApprovalUsed bool   `json:"approval_used,omitempty"`
}

type ExplainTerminalCommandResult struct {
	Snapshot      conversation.Snapshot `json:"snapshot"`
	ProviderError string                `json:"provider_error,omitempty"`
	OutputExcerpt string                `json:"output_excerpt,omitempty"`
}

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
	outputExcerpt := summarizeTerminalOutput(snapshot.Chunks)

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
	if appendErr := r.Audit.Append(audit.Event{
		ToolName:        "agent.terminal_command",
		Summary:         fmt.Sprintf("explain terminal command: %s", trimSummary(command)),
		WorkspaceID:     conversationContext.WorkspaceID,
		PromptProfileID: profile.PromptProfileID,
		RoleID:          profile.RoleID,
		ModeID:          profile.ModeID,
		SecurityPosture: profile.SecurityPosture,
		AffectedWidgets: affectedWidgets(widgetID),
		ApprovalUsed:    request.ApprovalUsed,
		Success:         !providerFailed,
		Error:           result.ProviderError,
	}); appendErr != nil {
		return ExplainTerminalCommandResult{}, appendErr
	}

	return ExplainTerminalCommandResult{
		Snapshot:      result.Snapshot,
		ProviderError: result.ProviderError,
		OutputExcerpt: outputExcerpt,
	}, nil
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

func summarizeTerminalOutput(chunks []terminal.OutputChunk) string {
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
	output := strings.TrimSpace(builder.String())
	if len(output) > 4000 {
		output = output[len(output)-4000:]
	}
	return output
}
