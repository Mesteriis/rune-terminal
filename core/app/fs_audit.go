package app

import (
	"path/filepath"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type FSAuditInput struct {
	ToolName           string
	Summary            string
	ActionSource       string
	TargetConnectionID string
	AffectedPaths      []string
	Success            bool
	Error              error
}

func (r *Runtime) AppendFSAudit(input FSAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	toolName := strings.TrimSpace(input.ToolName)
	if toolName == "" {
		toolName = "fs.mutation"
	}
	actionSource := strings.TrimSpace(input.ActionSource)
	if actionSource == "" {
		actionSource = "http.fs"
	}
	event := audit.Event{
		ToolName:           toolName,
		Summary:            strings.TrimSpace(input.Summary),
		ActionSource:       actionSource,
		TargetConnectionID: strings.TrimSpace(input.TargetConnectionID),
		AffectedPaths:      normalizeFSAuditPaths(input.AffectedPaths),
		Success:            input.Success,
		Error:              errorString(input.Error),
	}
	_ = r.Audit.Append(event)
}

func normalizeFSAuditPaths(paths []string) []string {
	normalized := make([]string, 0, len(paths))
	seen := make(map[string]struct{}, len(paths))
	for _, rawPath := range paths {
		path := strings.TrimSpace(rawPath)
		if path == "" {
			continue
		}
		path = filepath.Clean(path)
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		normalized = append(normalized, path)
	}
	return normalized
}
