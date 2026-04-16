package app

import (
	"context"
	"errors"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

var ErrMCPRuntimeNotConfigured = errors.New("mcp runtime is not configured")

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
	return r.MCP.Invoke(ctx, request)
}
