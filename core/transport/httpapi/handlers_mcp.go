package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
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

func normalizeRemoteMCPRegistration(payload registerMCPServerRequest, targetID string) (app.MCPRegistrationRequest, error) {
	id := strings.TrimSpace(payload.ID)
	if id == "" {
		id = strings.TrimSpace(targetID)
	}
	if id == "" {
		return app.MCPRegistrationRequest{}, errors.New("id is required")
	}

	normalizedTargetID := strings.TrimSpace(targetID)
	if normalizedTargetID != "" && id != normalizedTargetID {
		return app.MCPRegistrationRequest{}, errors.New("id must match the target server")
	}

	registrationType := strings.TrimSpace(payload.Type)
	if registrationType != "remote" {
		return app.MCPRegistrationRequest{}, errors.New("type must be remote")
	}

	endpoint := strings.TrimSpace(payload.Endpoint)
	if endpoint == "" {
		return app.MCPRegistrationRequest{}, errors.New("endpoint is required")
	}

	parsedEndpoint, err := url.Parse(endpoint)
	if err != nil || parsedEndpoint.Scheme == "" || parsedEndpoint.Host == "" {
		return app.MCPRegistrationRequest{}, errors.New("endpoint must be an absolute URL")
	}
	if parsedEndpoint.Scheme != "http" && parsedEndpoint.Scheme != "https" {
		return app.MCPRegistrationRequest{}, errors.New("endpoint scheme must be http or https")
	}

	headers := make(map[string]string, len(payload.Headers))
	for name, value := range payload.Headers {
		headerName := strings.TrimSpace(name)
		if headerName == "" {
			return app.MCPRegistrationRequest{}, errors.New("header names must be non-empty")
		}
		if strings.ContainsAny(headerName, "\r\n") {
			return app.MCPRegistrationRequest{}, errors.New("header names must not contain newlines")
		}
		if strings.ContainsAny(value, "\r\n") {
			return app.MCPRegistrationRequest{}, errors.New("header values must not contain newlines")
		}
		headers[headerName] = value
	}

	return app.MCPRegistrationRequest{
		ID:       id,
		Type:     registrationType,
		Endpoint: parsedEndpoint.String(),
		Headers:  headers,
	}, nil
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

	request, err := normalizeRemoteMCPRegistration(payload, "")
	if err != nil {
		writeBadRequest(w, "invalid_request", err)
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
	request, err := normalizeRemoteMCPRegistration(payload, serverID)
	if err != nil {
		writeBadRequest(w, "invalid_request", err)
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
	default:
		writeInternalError(w, err)
	}
}
