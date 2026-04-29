package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/audit"
)

type AgentSelectionAuditInput struct {
	Action       string
	SelectedID   string
	Summary      string
	ActionSource string
	Selection    agent.Selection
	Success      bool
	Error        error
}

func (r *Runtime) AppendAgentSelectionAudit(input AgentSelectionAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	action := strings.TrimSpace(input.Action)
	if action == "" {
		action = "selection"
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.agent.selection"
	}
	policyProfile := input.Selection.EffectivePolicyProfile()
	_ = r.Audit.Append(audit.Event{
		ToolName:        "agent.selection." + action,
		Summary:         agentSelectionAuditSummary(action, input.SelectedID, input.Summary),
		ActionSource:    actionSource,
		PromptProfileID: strings.TrimSpace(policyProfile.PromptProfileID),
		RoleID:          strings.TrimSpace(policyProfile.RoleID),
		ModeID:          strings.TrimSpace(policyProfile.ModeID),
		SecurityPosture: strings.TrimSpace(policyProfile.SecurityPosture),
		Success:         input.Success,
		Error:           errorString(input.Error),
	})
}

func agentSelectionAuditSummary(action string, selectedID string, summary string) string {
	if summary = strings.TrimSpace(summary); summary != "" {
		return summary
	}
	parts := []string{}
	if action = strings.TrimSpace(action); action != "" {
		parts = append(parts, "selection="+action)
	}
	if selectedID = strings.TrimSpace(selectedID); selectedID != "" {
		parts = append(parts, "selected_id="+selectedID)
	}
	return strings.Join(parts, " ")
}
