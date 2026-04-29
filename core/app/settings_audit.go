package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type SettingsAuditInput struct {
	Area         string
	Summary      string
	ActionSource string
	Success      bool
	Error        error
}

func (r *Runtime) AppendSettingsAudit(input SettingsAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	area := strings.TrimSpace(input.Area)
	if area == "" {
		area = "unknown"
	}
	area = strings.ReplaceAll(area, "-", "_")
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.settings"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:     "settings." + area + ".update",
		Summary:      strings.TrimSpace(input.Summary),
		ActionSource: actionSource,
		Success:      input.Success,
		Error:        errorString(input.Error),
	})
}
