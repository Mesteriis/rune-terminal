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

func (r *Runtime) RegisterMCPServer(request MCPRegistrationRequest) (server plugins.MCPServerSnapshot, err error) {
	auditServerID := strings.TrimSpace(request.ID)
	auditEndpoint := strings.TrimSpace(request.Endpoint)
	defer func() {
		if server.ID != "" {
			auditServerID = server.ID
			auditEndpoint = server.Endpoint
		}
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "register",
			ServerID: auditServerID,
			Endpoint: auditEndpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	normalizedRequest, err := NormalizeRemoteMCPRegistrationRequest(request, "")
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	auditServerID = normalizedRequest.ID
	auditEndpoint = normalizedRequest.Endpoint

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
		_ = r.MCP.Registry().Delete(spec.ID)
		return plugins.MCPServerSnapshot{}, err
	}
	server, err = r.MCP.Registry().Get(spec.ID)
	return server, err
}

func (r *Runtime) UpdateMCPServer(
	serverID string,
	request MCPRegistrationRequest,
) (server plugins.MCPServerSnapshot, err error) {
	auditServerID := strings.TrimSpace(firstNonEmpty(request.ID, serverID))
	auditEndpoint := strings.TrimSpace(request.Endpoint)
	defer func() {
		if server.ID != "" {
			auditServerID = server.ID
			auditEndpoint = server.Endpoint
		}
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "update",
			ServerID: auditServerID,
			Endpoint: auditEndpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}

	normalizedRequest, err := NormalizeRemoteMCPRegistrationRequest(request, serverID)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	auditServerID = normalizedRequest.ID
	auditEndpoint = normalizedRequest.Endpoint

	id := normalizedRequest.ID
	existingSpec, err := r.MCP.Registry().Spec(id)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if existingSpec.Type != plugins.MCPServerTypeRemote {
		return plugins.MCPServerSnapshot{}, fmt.Errorf("%w: only remote mcp servers can be updated", plugins.ErrInvalidPluginSpec)
	}
	server, err = r.MCP.Registry().Get(id)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	previousServer := server
	if server.Active {
		if err := r.MCP.Stop(id, false); err != nil {
			return plugins.MCPServerSnapshot{}, err
		}
	}

	headers := cloneMCPHeaders(normalizedRequest.Headers)
	if existingSpec.Remote != nil {
		headers = mergeMCPHeadersPreservingRedactedSecrets(existingSpec.Remote.Headers, normalizedRequest.Headers)
	}

	if err := r.MCP.Registry().Update(plugins.MCPServerSpec{
		ID:   id,
		Type: plugins.MCPServerTypeRemote,
		Remote: &plugins.MCPRemoteConfig{
			Endpoint: normalizedRequest.Endpoint,
			Headers:  headers,
		},
	}); err != nil {
		restoreMCPServerRegistryState(r.MCP.Registry(), existingSpec, previousServer)
		return plugins.MCPServerSnapshot{}, err
	}
	if err := r.persistMCPRegistry(); err != nil {
		restoreMCPServerRegistryState(r.MCP.Registry(), existingSpec, previousServer)
		return plugins.MCPServerSnapshot{}, err
	}
	server, err = r.MCP.Registry().Get(id)
	return server, err
}

func (r *Runtime) DeleteMCPServer(serverID string) (err error) {
	auditServerID := strings.TrimSpace(serverID)
	auditEndpoint := ""
	defer func() {
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "delete",
			ServerID: auditServerID,
			Endpoint: auditEndpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

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
	if spec.Remote != nil {
		auditEndpoint = spec.Remote.Endpoint
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
		restoreMCPServerRegistryState(r.MCP.Registry(), spec, server)
		return err
	}
	if err := r.persistMCPRegistry(); err != nil {
		restoreMCPServerRegistryState(r.MCP.Registry(), spec, server)
		return err
	}
	return nil
}

func (r *Runtime) ListMCPServers() []plugins.MCPServerSnapshot {
	if r.MCP == nil {
		return nil
	}
	return r.MCP.Registry().List()
}

func (r *Runtime) StartMCPServer(
	ctx context.Context,
	serverID string,
) (server plugins.MCPServerSnapshot, err error) {
	auditServerID := strings.TrimSpace(serverID)
	defer func() {
		if server.ID != "" {
			auditServerID = server.ID
		}
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "start",
			ServerID: auditServerID,
			Endpoint: server.Endpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.Start(ctx, serverID); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	server, err = r.MCP.Registry().Get(serverID)
	return server, err
}

func (r *Runtime) StopMCPServer(serverID string) (server plugins.MCPServerSnapshot, err error) {
	auditServerID := strings.TrimSpace(serverID)
	defer func() {
		if server.ID != "" {
			auditServerID = server.ID
		}
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "stop",
			ServerID: auditServerID,
			Endpoint: server.Endpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.Stop(serverID, false); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	server, err = r.MCP.Registry().Get(serverID)
	return server, err
}

func (r *Runtime) RestartMCPServer(
	ctx context.Context,
	serverID string,
) (server plugins.MCPServerSnapshot, err error) {
	auditServerID := strings.TrimSpace(serverID)
	defer func() {
		if server.ID != "" {
			auditServerID = server.ID
		}
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   "restart",
			ServerID: auditServerID,
			Endpoint: server.Endpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	if err := r.MCP.Restart(ctx, serverID); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	server, err = r.MCP.Registry().Get(serverID)
	return server, err
}

func (r *Runtime) SetMCPServerEnabled(
	serverID string,
	enabled bool,
) (server plugins.MCPServerSnapshot, err error) {
	action := "disable"
	if enabled {
		action = "enable"
	}
	auditServerID := strings.TrimSpace(serverID)
	defer func() {
		if server.ID != "" {
			auditServerID = server.ID
		}
		r.appendMCPLifecycleAudit(mcpLifecycleAuditInput{
			Action:   action,
			ServerID: auditServerID,
			Endpoint: server.Endpoint,
			Success:  err == nil,
			Error:    err,
		})
	}()

	if r.MCP == nil {
		return plugins.MCPServerSnapshot{}, ErrMCPRuntimeNotConfigured
	}
	previousServer, err := r.MCP.Registry().Get(serverID)
	if err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if err := r.MCP.SetEnabled(serverID, enabled); err != nil {
		return plugins.MCPServerSnapshot{}, err
	}
	if err := r.persistMCPRegistry(); err != nil {
		restoreMCPServerSnapshot(r.MCP.Registry(), previousServer)
		if previousServer.Enabled && previousServer.Active {
			if restartErr := r.MCP.Start(context.Background(), previousServer.ID); restartErr != nil {
				return plugins.MCPServerSnapshot{}, errors.Join(err, restartErr)
			}
		}
		return plugins.MCPServerSnapshot{}, err
	}
	server, err = r.MCP.Registry().Get(serverID)
	return server, err
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

func restoreMCPServerRegistryState(registry *plugins.MCPRegistry, spec plugins.MCPServerSpec, snapshot plugins.MCPServerSnapshot) {
	if registry == nil || strings.TrimSpace(spec.ID) == "" {
		return
	}
	if _, err := registry.Get(spec.ID); errors.Is(err, plugins.ErrMCPServerNotFound) {
		_ = registry.Register(spec)
	} else {
		_ = registry.Update(spec)
	}
	restoreMCPServerSnapshot(registry, snapshot)
}

func restoreMCPServerSnapshot(registry *plugins.MCPRegistry, snapshot plugins.MCPServerSnapshot) {
	if registry == nil || strings.TrimSpace(snapshot.ID) == "" {
		return
	}
	_ = registry.SetEnabled(snapshot.ID, snapshot.Enabled)
	_ = registry.SetState(snapshot.ID, snapshot.State)
	_ = registry.SetActive(snapshot.ID, snapshot.Active)
	if !snapshot.LastUsed.IsZero() {
		_ = registry.Touch(snapshot.ID, snapshot.LastUsed)
	}
}
