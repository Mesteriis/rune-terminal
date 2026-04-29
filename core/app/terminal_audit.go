package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type TerminalAuditInput struct {
	ToolName           string
	Summary            string
	ActionSource       string
	WidgetID           string
	TargetSession      string
	TargetConnectionID string
	Success            bool
	Error              error
}

func (r *Runtime) AppendTerminalAudit(input TerminalAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	toolName := strings.TrimSpace(input.ToolName)
	if toolName == "" {
		toolName = "terminal.control"
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.terminal"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:           toolName,
		Summary:            strings.TrimSpace(input.Summary),
		ActionSource:       actionSource,
		TargetSession:      strings.TrimSpace(input.TargetSession),
		TargetConnectionID: strings.TrimSpace(input.TargetConnectionID),
		AffectedWidgets:    normalizeWorkspaceAuditIDs([]string{input.WidgetID}),
		Success:            input.Success,
		Error:              errorString(input.Error),
	})
}
