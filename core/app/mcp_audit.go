package app

import (
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type mcpLifecycleAuditInput struct {
	Action   string
	ServerID string
	Endpoint string
	Success  bool
	Error    error
}

func (r *Runtime) appendMCPLifecycleAudit(input mcpLifecycleAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	action := strings.TrimSpace(input.Action)
	if action == "" {
		action = "lifecycle"
	}
	_ = r.Audit.Append(audit.Event{
		ToolName:     "mcp." + action,
		Summary:      mcpLifecycleAuditSummary(action, input.ServerID, input.Endpoint),
		ActionSource: "mcp.lifecycle",
		Success:      input.Success,
		Error:        errorString(input.Error),
	})
}

func mcpLifecycleAuditSummary(action string, serverID string, endpoint string) string {
	parts := []string{fmt.Sprintf("action=%s", strings.TrimSpace(action))}
	if id := strings.TrimSpace(serverID); id != "" {
		parts = append(parts, "server_id="+id)
	}
	if endpoint := strings.TrimSpace(endpoint); endpoint != "" {
		parts = append(parts, "endpoint="+endpoint)
	}
	return strings.Join(parts, " ")
}
