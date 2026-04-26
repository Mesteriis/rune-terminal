package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/plugins"
)

type registerMCPServerRequest struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Endpoint string            `json:"endpoint"`
	Headers  map[string]string `json:"headers,omitempty"`
}

type mcpServerDetailsResponse struct {
	ID       string                  `json:"id"`
	Type     plugins.MCPServerType   `json:"type"`
	Endpoint string                  `json:"endpoint,omitempty"`
	State    plugins.MCPProcessState `json:"state"`
	LastUsed any                     `json:"last_used,omitempty"`
	Active   bool                    `json:"active"`
	Enabled  bool                    `json:"enabled"`
	Headers  map[string]string       `json:"headers,omitempty"`
}

func encodeMCPServerDetails(snapshot plugins.MCPServerSnapshot, spec plugins.MCPServerSpec) mcpServerDetailsResponse {
	headers := map[string]string(nil)
	if spec.Remote != nil && len(spec.Remote.Headers) > 0 {
		headers = make(map[string]string, len(spec.Remote.Headers))
		for key, value := range spec.Remote.Headers {
			headers[key] = value
		}
	}
	return mcpServerDetailsResponse{
		ID:       snapshot.ID,
		Type:     snapshot.Type,
		Endpoint: snapshot.Endpoint,
		State:    snapshot.State,
		LastUsed: snapshot.LastUsed,
		Active:   snapshot.Active,
		Enabled:  snapshot.Enabled,
		Headers:  headers,
	}
}

func (api *API) handleRegisterMCPServer(w http.ResponseWriter, r *http.Request) {
	var payload registerMCPServerRequest
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	request, err := app.NormalizeRemoteMCPRegistrationRequest(app.MCPRegistrationRequest{
		ID:       payload.ID,
		Type:     payload.Type,
		Endpoint: payload.Endpoint,
		Headers:  payload.Headers,
	}, "")
	if err != nil {
		writeMCPError(w, err)
		return
	}

	server, err := api.runtime.RegisterMCPServer(request)
	if err != nil {
		writeMCPError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"server": server,
	})
}

func (api *API) handleListMCPServers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"servers": api.runtime.ListMCPServers(),
	})
}

func (api *API) handleListMCPCatalog(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"templates": api.runtime.MCPTemplateCatalog(),
	})
}

func (api *API) handleGetMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	server, err := api.runtime.GetMCPServer(serverID)
	if err != nil {
		writeMCPError(w, err)
		return
	}
	spec, err := api.runtime.GetMCPServerSpec(serverID)
	if err != nil {
		writeMCPError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"server": encodeMCPServerDetails(server, spec),
	})
}

func (api *API) handleUpdateMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")

	var payload registerMCPServerRequest
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	request, err := app.NormalizeRemoteMCPRegistrationRequest(app.MCPRegistrationRequest{
		ID:       payload.ID,
		Type:     payload.Type,
		Endpoint: payload.Endpoint,
		Headers:  payload.Headers,
	}, serverID)
	if err != nil {
		writeMCPError(w, err)
		return
	}

	server, err := api.runtime.UpdateMCPServer(serverID, request)
	if err != nil {
		writeMCPError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"server": server,
	})
}

func (api *API) handleDeleteMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	if err := api.runtime.DeleteMCPServer(serverID); err != nil {
		writeMCPError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"server_id": strings.TrimSpace(serverID),
	})
}

func (api *API) handleStartMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	server, err := api.runtime.StartMCPServer(r.Context(), serverID)
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"server": server,
	})
}

func (api *API) handleStopMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	server, err := api.runtime.StopMCPServer(serverID)
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"server": server,
	})
}

func (api *API) handleRestartMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	server, err := api.runtime.RestartMCPServer(r.Context(), serverID)
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"server": server,
	})
}

func (api *API) handleEnableMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	server, err := api.runtime.SetMCPServerEnabled(serverID, true)
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"server": server,
	})
}

func (api *API) handleDisableMCPServer(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("serverID")
	server, err := api.runtime.SetMCPServerEnabled(serverID, false)
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"server": server,
	})
}

type invokeMCPRequest struct {
	ServerID           string          `json:"server_id"`
	Payload            json.RawMessage `json:"payload,omitempty"`
	AllowOnDemandStart bool            `json:"allow_on_demand_start,omitempty"`
	IncludeContext     bool            `json:"include_context,omitempty"`
	ActionSource       string          `json:"action_source,omitempty"`
	WorkspaceID        string          `json:"workspace_id,omitempty"`
}

func (api *API) handleInvokeMCP(w http.ResponseWriter, r *http.Request) {
	var payload invokeMCPRequest
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.InvokeMCP(r.Context(), plugins.MCPInvokeRequest{
		ServerID:           payload.ServerID,
		Payload:            payload.Payload,
		AllowOnDemandStart: payload.AllowOnDemandStart,
		IncludeContext:     payload.IncludeContext,
		ActionSource:       payload.ActionSource,
		WorkspaceID:        payload.WorkspaceID,
	})
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleProbeMCPServer(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Endpoint string            `json:"endpoint"`
		Headers  map[string]string `json:"headers,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.ProbeRemoteMCPServer(r.Context(), app.MCPProbeRequest{
		Endpoint: payload.Endpoint,
		Headers:  payload.Headers,
	})
	if err != nil {
		writeMCPError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"probe": result,
	})
}

func writeMCPError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, app.ErrMCPRuntimeNotConfigured):
		writeServiceUnavailable(w, "mcp_not_configured", err.Error())
	case errors.Is(err, plugins.ErrMCPServerNotFound):
		writeNotFound(w, "mcp_server_not_found", err.Error())
	case errors.Is(err, plugins.ErrMCPServerRegistered):
		writeError(w, http.StatusConflict, "mcp_server_registered", err.Error())
	case errors.Is(err, plugins.ErrInvalidPluginSpec):
		writeBadRequest(w, "invalid_mcp_request", err)
	case errors.Is(err, plugins.ErrMCPExplicitStartRequired):
		writeError(w, http.StatusConflict, "mcp_start_required", err.Error())
	case errors.Is(err, plugins.ErrMCPServerDisabled):
		writeError(w, http.StatusConflict, "mcp_server_disabled", err.Error())
	case errors.Is(err, plugins.ErrMCPServerBusy):
		writeError(w, http.StatusConflict, "mcp_server_busy", err.Error())
	case errors.Is(err, plugins.ErrInvalidPluginSpec):
		writeBadRequest(w, "invalid_mcp_request", err)
	default:
		writeInternalError(w, err)
	}
}
