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

func (api *API) handleRegisterMCPServer(w http.ResponseWriter, r *http.Request) {
	var payload registerMCPServerRequest
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	id := strings.TrimSpace(payload.ID)
	if id == "" {
		writeBadRequest(w, "invalid_request", errors.New("id is required"))
		return
	}

	registrationType := strings.TrimSpace(payload.Type)
	if registrationType != "remote" {
		writeBadRequest(w, "invalid_request", errors.New("type must be remote"))
		return
	}

	endpoint := strings.TrimSpace(payload.Endpoint)
	if endpoint == "" {
		writeBadRequest(w, "invalid_request", errors.New("endpoint is required"))
		return
	}

	parsedEndpoint, err := url.Parse(endpoint)
	if err != nil || parsedEndpoint.Scheme == "" || parsedEndpoint.Host == "" {
		writeBadRequest(w, "invalid_request", errors.New("endpoint must be an absolute URL"))
		return
	}
	if parsedEndpoint.Scheme != "http" && parsedEndpoint.Scheme != "https" {
		writeBadRequest(w, "invalid_request", errors.New("endpoint scheme must be http or https"))
		return
	}

	headers := make(map[string]string, len(payload.Headers))
	for name, value := range payload.Headers {
		headerName := strings.TrimSpace(name)
		if headerName == "" {
			writeBadRequest(w, "invalid_request", errors.New("header names must be non-empty"))
			return
		}
		if strings.ContainsAny(headerName, "\r\n") {
			writeBadRequest(w, "invalid_request", errors.New("header names must not contain newlines"))
			return
		}
		if strings.ContainsAny(value, "\r\n") {
			writeBadRequest(w, "invalid_request", errors.New("header values must not contain newlines"))
			return
		}
		headers[headerName] = value
	}

	server, err := api.runtime.RegisterMCPServer(app.MCPRegistrationRequest{
		ID:       id,
		Type:     registrationType,
		Endpoint: parsedEndpoint.String(),
		Headers:  headers,
	})
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
