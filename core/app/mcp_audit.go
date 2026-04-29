package app

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type mcpLifecycleAuditInput struct {
	Action   string
	ServerID string
	Endpoint string
	Status   string
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
		Summary:      mcpLifecycleAuditSummary(action, input.ServerID, input.Endpoint, input.Status),
		ActionSource: "mcp.lifecycle",
		Success:      input.Success,
		Error:        errorString(input.Error),
	})
}

func mcpLifecycleAuditSummary(action string, serverID string, endpoint string, statuses ...string) string {
	parts := []string{fmt.Sprintf("action=%s", strings.TrimSpace(action))}
	if id := strings.TrimSpace(serverID); id != "" {
		parts = append(parts, "server_id="+id)
	}
	if endpoint := strings.TrimSpace(endpoint); endpoint != "" {
		parts = append(parts, "endpoint="+redactMCPAuditEndpoint(endpoint))
	}
	for _, rawStatus := range statuses {
		if status := strings.TrimSpace(rawStatus); status != "" {
			parts = append(parts, "status="+status)
			break
		}
	}
	return strings.Join(parts, " ")
}

func redactMCPAuditEndpoint(rawEndpoint string) string {
	endpoint := strings.TrimSpace(rawEndpoint)
	if endpoint == "" {
		return ""
	}
	parsedEndpoint, err := url.Parse(endpoint)
	if err != nil || parsedEndpoint.Scheme == "" || parsedEndpoint.Host == "" {
		return "<invalid>"
	}
	parsedEndpoint.User = nil
	parsedEndpoint.RawQuery = ""
	parsedEndpoint.ForceQuery = false
	parsedEndpoint.Fragment = ""
	return parsedEndpoint.String()
}
