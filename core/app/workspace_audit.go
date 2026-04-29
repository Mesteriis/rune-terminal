package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type WorkspaceAuditInput struct {
	ToolName           string
	Summary            string
	ActionSource       string
	WorkspaceID        string
	TargetConnectionID string
	AffectedPaths      []string
	AffectedWidgets    []string
	Success            bool
	Error              error
}

func (r *Runtime) AppendWorkspaceAudit(input WorkspaceAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	toolName := strings.TrimSpace(input.ToolName)
	if toolName == "" {
		toolName = "workspace.mutation"
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.workspace"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:           toolName,
		Summary:            strings.TrimSpace(input.Summary),
		WorkspaceID:        strings.TrimSpace(input.WorkspaceID),
		ActionSource:       actionSource,
		TargetConnectionID: strings.TrimSpace(input.TargetConnectionID),
		AffectedPaths:      normalizeFSAuditPaths(input.AffectedPaths),
		AffectedWidgets:    normalizeWorkspaceAuditIDs(input.AffectedWidgets),
		Success:            input.Success,
		Error:              errorString(input.Error),
	})
}

func normalizeWorkspaceAuditIDs(values []string) []string {
	normalized := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, rawValue := range values {
		value := strings.TrimSpace(rawValue)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		normalized = append(normalized, value)
	}
	return normalized
}
