package httpapi

import (
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/connections"
)

func (api *API) handleConnections(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, api.runtime.ConnectionsSnapshot())
}

func (api *API) handleCheckConnection(w http.ResponseWriter, r *http.Request) {
	connectionID := r.PathValue("connectionID")
	connection, snapshot, err := api.runtime.CheckConnection(r.Context(), connectionID)
	if err != nil {
		api.appendConnectionAudit(
			"connections.check",
			"Check connection",
			"http.connections",
			connectionID,
			nil,
			err,
		)
		writeConnectionError(w, err)
		return
	}
	api.appendConnectionAudit(
		"connections.check",
		"Check connection",
		"http.connections",
		connection.ID,
		nil,
		nil,
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"connection":  connection,
		"connections": snapshot,
	})
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
		api.appendConnectionAudit(
			"connections.select",
			"Select active connection",
			"http.connections",
			payload.ConnectionID,
			nil,
			err,
		)
		writeConnectionError(w, err)
		return
	}
	api.appendConnectionAudit(
		"connections.select",
		"Select active connection",
		"http.connections",
		payload.ConnectionID,
		nil,
		nil,
	)
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
		api.appendConnectionAudit(
			"connections.save_ssh",
			"Save SSH connection",
			"http.connections",
			payload.ID,
			nil,
			err,
		)
		writeConnectionError(w, err)
		return
	}
	api.appendConnectionAudit(
		"connections.save_ssh",
		"Save SSH connection",
		"http.connections",
		connection.ID,
		nil,
		nil,
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"connection":  connection,
		"connections": snapshot,
	})
}

func (api *API) appendConnectionAudit(
	toolName string,
	summary string,
	actionSource string,
	connectionID string,
	affectedPaths []string,
	err error,
) {
	if api == nil || api.runtime == nil {
		return
	}
	api.runtime.AppendConnectionAudit(app.ConnectionAuditInput{
		ToolName:           toolName,
		Summary:            summary,
		ActionSource:       actionSource,
		TargetConnectionID: connectionID,
		AffectedPaths:      affectedPaths,
		Success:            err == nil,
		Error:              err,
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
