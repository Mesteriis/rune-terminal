package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/plugins"
)

var ErrMCPRuntimeNotConfigured = errors.New("mcp runtime is not configured")

type MCPRegistrationRequest struct {
	ID       string
	Type     string
	Endpoint string
	Headers  map[string]string
}

func (r *Runtime) registerMCPServers() error {
	if r.MCP == nil {
		return nil
	}
	for _, spec := range []plugins.MCPServerSpec{
		{
			ID: "mcp.example",
			Process: plugins.ProcessConfig{
				Command: pluginExecutable(),
				Args:    []string{"plugin-example"},
			},
		},
	} {
		if err := r.MCP.Registry().Register(spec); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runtime) RegisterMCPServer(request MCPRegistrationRequest) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}

	headersJSON, err := json.Marshal(request.Headers)
	if err != nil {
		return plugins.MCPServerSnapshot{}, fmt.Errorf("%w: invalid headers", plugins.ErrInvalidPluginSpec)
	}

	spec := plugins.MCPServerSpec{
		ID: strings.TrimSpace(request.ID),
		Process: plugins.ProcessConfig{
			Command: pluginExecutable(),
			Args:    []string{"plugin-example"},
			Env: []string{
				"RTERM_MCP_SERVER_TYPE=" + strings.TrimSpace(request.Type),
				"RTERM_MCP_SERVER_ENDPOINT=" + strings.TrimSpace(request.Endpoint),
				"RTERM_MCP_SERVER_HEADERS=" + string(headersJSON),
			},
		},
	}

	if err := r.MCP.Registry().Register(spec); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(spec.ID)
}

func (r *Runtime) ListMCPServers() []plugins.MCPServerSnapshot {
	if r.MCP == nil {
		return nil
	}
	return r.MCP.Registry().List()
}

func (r *Runtime) StartMCPServer(ctx context.Context, serverID string) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.Start(ctx, serverID); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(serverID)
}

func (r *Runtime) StopMCPServer(serverID string) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.Stop(serverID, false); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(serverID)
}

func (r *Runtime) RestartMCPServer(ctx context.Context, serverID string) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.Restart(ctx, serverID); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(serverID)
}

func (r *Runtime) SetMCPServerEnabled(serverID string, enabled bool) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.SetEnabled(serverID, enabled); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(serverID)
}

func (r *Runtime) InvokeMCP(ctx context.Context, request plugins.MCPInvokeRequest) (plugins.MCPInvokeResult, error) {
	if r.MCP == nil {
		return plugins.MCPInvokeResult{}, ErrMCPRuntimeNotConfigured
	}
	result, err := r.MCP.Invoke(ctx, request)
	auditEvent := audit.Event{
		ToolName:     "mcp.invoke",
		Summary:      fmt.Sprintf("invoke MCP server: %s", strings.TrimSpace(request.ServerID)),
		WorkspaceID:  strings.TrimSpace(request.WorkspaceID),
		ActionSource: strings.TrimSpace(request.ActionSource),
		Success:      err == nil,
	}
	if err != nil {
		auditEvent.Error = err.Error()
	}
	_ = r.Audit.Append(auditEvent)
	if err != nil {
		return plugins.MCPInvokeResult{}, err
	}
	return result, nil
}
