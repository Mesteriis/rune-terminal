package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/plugins"
)

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
