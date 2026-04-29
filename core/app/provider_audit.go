package app

import (
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type ProviderAuditInput struct {
	ToolName     string
	Action       string
	ProviderID   string
	ProviderKind string
	Summary      string
	ActionSource string
	Success      bool
	Error        error
}

func (r *Runtime) AppendProviderAudit(input ProviderAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	toolName := strings.TrimSpace(input.ToolName)
	if toolName == "" {
		action := strings.TrimSpace(input.Action)
		if action == "" {
			action = "mutation"
		}
		toolName = "providers." + action
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.providers"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:     toolName,
		Summary:      providerAuditSummary(input),
		ActionSource: actionSource,
		Success:      input.Success,
		Error:        errorString(input.Error),
	})
}

func providerAuditSummary(input ProviderAuditInput) string {
	if summary := strings.TrimSpace(input.Summary); summary != "" {
		return summary
	}

	parts := []string{}
	if action := strings.TrimSpace(input.Action); action != "" {
		parts = append(parts, fmt.Sprintf("action=%s", action))
	}
	if providerID := strings.TrimSpace(input.ProviderID); providerID != "" {
		parts = append(parts, "provider_id="+providerID)
	}
	if providerKind := strings.TrimSpace(input.ProviderKind); providerKind != "" {
		parts = append(parts, "provider_kind="+providerKind)
	}
	return strings.Join(parts, " ")
}
