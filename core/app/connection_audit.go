package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type ConnectionAuditInput struct {
	ToolName           string
	Summary            string
	ActionSource       string
	TargetConnectionID string
	AffectedPaths      []string
	Success            bool
	Error              error
}

func (r *Runtime) AppendConnectionAudit(input ConnectionAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	toolName := strings.TrimSpace(input.ToolName)
	if toolName == "" {
		toolName = "connections.mutation"
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.connections"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:           toolName,
		Summary:            strings.TrimSpace(input.Summary),
		ActionSource:       actionSource,
		TargetConnectionID: strings.TrimSpace(input.TargetConnectionID),
		AffectedPaths:      normalizeFSAuditPaths(input.AffectedPaths),
		Success:            input.Success,
		Error:              errorString(input.Error),
	})
}
