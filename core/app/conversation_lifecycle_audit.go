package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type ConversationLifecycleAuditInput struct {
	Action          string
	ConversationID  string
	Summary         string
	ActionSource    string
	AffectedWidgets []string
	Success         bool
	Error           error
}

func (r *Runtime) AppendConversationLifecycleAudit(input ConversationLifecycleAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	action := strings.TrimSpace(input.Action)
	if action == "" {
		action = "lifecycle"
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.agent.conversation"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:        "agent.conversation." + action,
		Summary:         conversationLifecycleAuditSummary(action, input.ConversationID, input.Summary),
		ActionSource:    actionSource,
		AffectedWidgets: normalizeWorkspaceAuditIDs(input.AffectedWidgets),
		Success:         input.Success,
		Error:           errorString(input.Error),
	})
}

func conversationLifecycleAuditSummary(action string, conversationID string, summary string) string {
	if summary = strings.TrimSpace(summary); summary != "" {
		return summary
	}
	parts := []string{}
	if action = strings.TrimSpace(action); action != "" {
		parts = append(parts, "action="+action)
	}
	if conversationID = strings.TrimSpace(conversationID); conversationID != "" {
		parts = append(parts, "conversation_id="+conversationID)
	}
	return strings.Join(parts, " ")
}
