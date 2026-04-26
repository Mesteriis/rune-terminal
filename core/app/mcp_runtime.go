package app

import (
	"context"
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

func (r *Runtime) GetMCPServer(serverID string) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	return r.MCP.Registry().Get(serverID)
}

func (r *Runtime) GetMCPServerSpec(serverID string) (plugins.MCPServerSpec, error) {
	if r.MCP == nil {
		return plugins.MCPServerSpec{}, ErrMCPRuntimeNotConfigured
	}
	return r.MCP.Registry().Spec(serverID)
}

func (r *Runtime) registerMCPServers() error {
	if r.MCP == nil {
		return nil
	}
	defaultSpecs := []plugins.MCPServerSpec{
		{
			ID: "mcp.example",
			Process: plugins.ProcessConfig{
				Command: pluginExecutable(),
				Args:    []string{"plugin-example"},
			},
		},
	}
	for _, spec := range defaultSpecs {
		if err := r.MCP.Registry().Register(spec); err != nil {
			if !errors.Is(err, plugins.ErrMCPServerRegistered) {
				return err
			}
		}
	}
	if err := r.loadPersistedMCPRegistry(); err != nil {
		return err
	}
	return r.persistMCPRegistry()
}

func (r *Runtime) RegisterMCPServer(request MCPRegistrationRequest) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	normalizedRequest, err := NormalizeRemoteMCPRegistrationRequest(request, "")
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}

	spec := plugins.MCPServerSpec{
		ID:   normalizedRequest.ID,
		Type: plugins.MCPServerTypeRemote,
		Remote: &plugins.MCPRemoteConfig{
			Endpoint: normalizedRequest.Endpoint,
			Headers:  cloneMCPHeaders(normalizedRequest.Headers),
		},
	}

	if err := r.MCP.Registry().Register(spec); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if err := r.persistMCPRegistry(); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(spec.ID)
}

func (r *Runtime) UpdateMCPServer(serverID string, request MCPRegistrationRequest) (plugins.MCPServerSnapshot, error) {
	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}

	normalizedRequest, err := NormalizeRemoteMCPRegistrationRequest(request, serverID)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}

	id := normalizedRequest.ID
	existingSpec, err := r.MCP.Registry().Spec(id)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if existingSpec.Type != plugins.MCPServerTypeRemote {
		return plugins.MCPServerSnapshot{}, fmt.Errorf("%w: only remote mcp servers can be updated", plugins.ErrInvalidPluginSpec)
	}
	server, err := r.MCP.Registry().Get(id)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if server.Active {
		if err := r.MCP.Stop(id, false); err != nil {
			return plugins.MCPServerSnapshot{}, err
		}
	}

	if err := r.MCP.Registry().Update(plugins.MCPServerSpec{
		ID:   id,
		Type: plugins.MCPServerTypeRemote,
		Remote: &plugins.MCPRemoteConfig{
			Endpoint: normalizedRequest.Endpoint,
			Headers:  cloneMCPHeaders(normalizedRequest.Headers),
		},
	}); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if err := r.persistMCPRegistry(); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(id)
}

func (r *Runtime) DeleteMCPServer(serverID string) error {
	if r.MCP == nil {
		return ErrMCPRuntimeNotConfigured
	}

	id := strings.TrimSpace(serverID)
	if id == "" {
		return fmt.Errorf("%w: id is required", plugins.ErrInvalidPluginSpec)
	}
	spec, err := r.MCP.Registry().Spec(id)
	if err != nil {
		return err
	}
	if spec.Type != plugins.MCPServerTypeRemote {
		return fmt.Errorf("%w: only remote mcp servers can be deleted", plugins.ErrInvalidPluginSpec)
	}
	server, err := r.MCP.Registry().Get(id)
	if err != nil {
		return err
	}
	if server.Active {
		if err := r.MCP.Stop(id, false); err != nil {
			return err
		}
	}
	if err := r.MCP.Registry().Delete(id); err != nil {
		return err
	}
	return r.persistMCPRegistry()
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
	if err := r.persistMCPRegistry(); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	return r.MCP.Registry().Get(serverID)
}

func (r *Runtime) InvokeMCP(ctx context.Context, request plugins.MCPInvokeRequest) (plugins.MCPInvokeResult, error) {
	if r.MCP == nil {
		return plugins.MCPInvokeResult{}, ErrMCPRuntimeNotConfigured
	}
	if strings.TrimSpace(request.WorkspaceID) == "" {
		return plugins.MCPInvokeResult{}, fmt.Errorf("%w: workspace_id is required", plugins.ErrInvalidPluginSpec)
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
