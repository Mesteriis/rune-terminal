package httpapi

import (
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/connections"
)

func (api *API) handleConnections(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.runtime.ConnectionsSnapshot())
}

func (api *API) handleSelectConnection(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		ConnectionID string `json:"connection_id"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.SelectActiveConnection(payload.ConnectionID)
	if err != nil {
		writeConnectionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleSaveSSHConnection(w http.ResponseWriter, r *http.Request) {
	var payload connections.SaveSSHInput
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	connection, snapshot, err := api.runtime.SaveSSHConnection(payload)
	if err != nil {
		writeConnectionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"connection":  connection,
		"connections": snapshot,
	})
}

func writeConnectionError(w http.ResponseWriter, err error) {
	normalized := app.NormalizePublicError(err)
	switch normalized.Code {
	case "not_found":
		writeNotFound(w, "connection_not_found", normalized.Message)
	case "invalid_input":
		writeBadRequest(w, "invalid_connection_request", normalized)
	default:
		writeInternalError(w, normalized)
	}
}
