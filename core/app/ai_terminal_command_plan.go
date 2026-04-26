package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

type PlanTerminalCommandRequest struct {
	Model    string `json:"model,omitempty"`
	Prompt   string `json:"prompt"`
	WidgetID string `json:"widget_id,omitempty"`
}

type PlanTerminalCommandResult struct {
	Command string `json:"command"`
	Summary string `json:"summary,omitempty"`
}

type terminalCommandPlanEnvelope struct {
	Command string `json:"command"`
	Reason  string `json:"reason,omitempty"`
	Summary string `json:"summary,omitempty"`
}

var ErrTerminalCommandPlanInvalid = errors.New("terminal command plan is invalid")

func (r *Runtime) PlanTerminalCommand(
	ctx context.Context,
	request PlanTerminalCommandRequest,
	conversationContext ConversationContext,
) (PlanTerminalCommandResult, error) {
	prompt := strings.TrimSpace(request.Prompt)
	if prompt == "" {
		return PlanTerminalCommandResult{}, conversation.ErrInvalidPrompt
	}

	widgetID, err := requireExplicitExecutionTarget(request.WidgetID, conversationContext)
	if err != nil {
		return PlanTerminalCommandResult{}, err
	}

	snapshot, err := r.Terminals.Snapshot(widgetID, 0)
	if err != nil {
		return PlanTerminalCommandResult{}, err
	}
	if err := validateExplainSnapshotTarget(snapshot.State, conversationContext); err != nil {
		return PlanTerminalCommandResult{}, err
	}

	provider, normalizedModel, err := r.resolveConversationProviderForModel(request.Model)
	if err != nil {
		return PlanTerminalCommandResult{}, err
	}
	if provider == nil {
		return PlanTerminalCommandResult{}, fmt.Errorf("conversation provider is not available")
	}

	selection, err := r.Agent.Selection()
	if err != nil {
		return PlanTerminalCommandResult{}, err
	}

	systemPrompt := strings.TrimSpace(selection.EffectivePrompt() + "\n\n" + buildConversationContextBlock(r, conversationContext))
	completion, _, err := provider.Complete(ctx, conversation.CompletionRequest{
		SystemPrompt: systemPrompt,
		Model:        normalizedModel,
		Messages: []conversation.ChatMessage{
			{
				Role: conversation.RoleUser,
				Content: buildTerminalCommandPlanningPrompt(
					prompt,
					widgetID,
					conversationContext,
					snapshot.State.Shell,
				),
			},
		},
	})
	if err != nil {
		return PlanTerminalCommandResult{}, err
	}

	plan, err := decodeTerminalCommandPlan(completion.Content)
	if err != nil {
		return PlanTerminalCommandResult{}, err
	}
	command := normalizeTerminalPlanCommand(plan.Command)
	if command == "" {
		reason := strings.TrimSpace(plan.Reason)
		if reason == "" {
			reason = "provider returned an empty command"
		}
		return PlanTerminalCommandResult{}, fmt.Errorf("%w: %s", ErrTerminalCommandPlanInvalid, reason)
	}

	return PlanTerminalCommandResult{
		Command: command,
		Summary: strings.TrimSpace(plan.Summary),
	}, nil
}

func buildTerminalCommandPlanningPrompt(
	prompt string,
	widgetID string,
	conversationContext ConversationContext,
	shell string,
) string {
	return strings.TrimSpace(fmt.Sprintf(`Plan exactly one shell command for the already-selected terminal target.

Return JSON only, with this exact shape:
{"command":"...","summary":"...","reason":""}

Rules:
- Return exactly one runnable shell command in "command".
- Do not wrap the JSON in markdown or code fences.
- Do not invent or switch hosts, IPs, SSH destinations, or terminal widgets.
- The terminal target is already fixed; plan only for that target.
- Prefer read-only diagnostic commands when the request is about checking state.
- If the request is too ambiguous or unsafe for a single command, return an empty "command" and explain why in "reason".
- Keep "summary" short and operator-focused.

Fixed terminal target:
- widget_id: %s
- target_session: %s
- target_connection_id: %s
- shell: %s

User request:
%s`, widgetID, conversationContext.TargetSession, conversationContext.TargetConnectionID, firstNonEmpty(shell, "unknown"), prompt))
}

func decodeTerminalCommandPlan(raw string) (terminalCommandPlanEnvelope, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return terminalCommandPlanEnvelope{}, fmt.Errorf("%w: provider returned empty output", ErrTerminalCommandPlanInvalid)
	}

	candidates := []string{trimmed}
	firstBraceIndex := strings.Index(trimmed, "{")
	lastBraceIndex := strings.LastIndex(trimmed, "}")
	if firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex {
		candidates = append(candidates, trimmed[firstBraceIndex:lastBraceIndex+1])
	}

	var plan terminalCommandPlanEnvelope
	for _, candidate := range candidates {
		if err := json.Unmarshal([]byte(candidate), &plan); err == nil {
			return plan, nil
		}
	}

	return terminalCommandPlanEnvelope{}, fmt.Errorf("%w: provider did not return valid JSON", ErrTerminalCommandPlanInvalid)
}

func normalizeTerminalPlanCommand(command string) string {
	trimmed := strings.TrimSpace(command)
	trimmed = strings.TrimPrefix(trimmed, "$ ")
	trimmed = strings.TrimPrefix(trimmed, "$")
	trimmed = strings.TrimSpace(trimmed)
	if strings.Contains(trimmed, "\n") || strings.Contains(trimmed, "\r") {
		return ""
	}
	return trimmed
}
