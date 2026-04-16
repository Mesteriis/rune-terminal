package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type ConversationContext struct {
	WorkspaceID          string `json:"workspace_id,omitempty"`
	RepoRoot             string `json:"repo_root,omitempty"`
	ActiveWidgetID       string `json:"active_widget_id,omitempty"`
	TargetSession        string `json:"target_session,omitempty"`
	TargetConnectionID   string `json:"target_connection_id,omitempty"`
	WidgetContextEnabled bool   `json:"widget_context_enabled,omitempty"`
}

func (r *Runtime) ConversationSnapshot() conversation.Snapshot {
	return r.Conversation.Snapshot()
}

func (r *Runtime) SubmitConversationPrompt(
	ctx context.Context,
	prompt string,
	conversationContext ConversationContext,
	attachments []conversation.AttachmentReference,
) (conversation.SubmitResult, error) {
	resolvedAttachments, err := resolveConversationAttachments(attachments)
	if err != nil {
		return conversation.SubmitResult{}, err
	}
	providerPrompt := buildPromptWithAttachmentContext(prompt, resolvedAttachments)

	selection, err := r.Agent.Selection()
	if err != nil {
		return conversation.SubmitResult{}, err
	}

	systemPrompt := strings.TrimSpace(selection.EffectivePrompt())
	contextBlock := buildConversationContextBlock(r, conversationContext)
	if contextBlock != "" {
		systemPrompt = strings.TrimSpace(systemPrompt + "\n\n" + contextBlock)
	}

	result, err := r.Conversation.Submit(ctx, conversation.SubmitRequest{
		SystemPrompt:   systemPrompt,
		Prompt:         prompt,
		ProviderPrompt: providerPrompt,
		Attachments:    attachments,
	})
	if err != nil {
		return conversation.SubmitResult{}, err
	}

	profile := selection.EffectivePolicyProfile()
	_ = r.Audit.Append(audit.Event{
		ToolName:        "agent.conversation",
		Summary:         summarizeConversationPrompt(prompt),
		WorkspaceID:     conversationContext.WorkspaceID,
		PromptProfileID: profile.PromptProfileID,
		RoleID:          profile.RoleID,
		ModeID:          profile.ModeID,
		SecurityPosture: profile.SecurityPosture,
		Success:         result.ProviderError == "",
		Error:           result.ProviderError,
		AffectedWidgets: affectedWidgets(conversationContext.ActiveWidgetID),
	})

	return result, nil
}

func buildConversationContextBlock(runtime *Runtime, conversationContext ConversationContext) string {
	lines := []string{
		"Current RunaTerminal context:",
		fmt.Sprintf("- Repository root: %s", firstNonEmpty(conversationContext.RepoRoot, runtime.RepoRoot)),
	}
	if conversationContext.WorkspaceID != "" {
		lines = append(lines, fmt.Sprintf("- Workspace: %s", conversationContext.WorkspaceID))
	}
	if conversationContext.WidgetContextEnabled && conversationContext.ActiveWidgetID != "" {
		lines = append(lines, fmt.Sprintf("- Active widget: %s", conversationContext.ActiveWidgetID))
	} else {
		lines = append(lines, "- Active widget context: detached")
	}
	if conversationContext.TargetSession != "" || conversationContext.TargetConnectionID != "" {
		targetSession := firstNonEmpty(conversationContext.TargetSession, "local")
		targetConnectionID := firstNonEmpty(conversationContext.TargetConnectionID, targetSession)
		lines = append(lines, fmt.Sprintf("- Active terminal target: %s (%s)", targetConnectionID, targetSession))
	}
	if activeConnection, err := runtime.Connections.Active(); err == nil {
		target := activeConnection.Name
		if target == "" {
			target = activeConnection.ID
		}
		lines = append(lines, fmt.Sprintf("- Default target: %s (%s)", target, activeConnection.Kind))
	}
	lines = append(lines, "- Keep responses concise and actionable. Do not assume tool execution unless the user explicitly asks for it through shell controls.")
	return strings.Join(lines, "\n")
}

func summarizeConversationPrompt(prompt string) string {
	trimmed := strings.TrimSpace(prompt)
	if len(trimmed) <= 120 {
		return trimmed
	}
	return trimmed[:117] + "..."
}

func affectedWidgets(activeWidgetID string) []string {
	if activeWidgetID == "" {
		return nil
	}
	return []string{activeWidgetID}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
