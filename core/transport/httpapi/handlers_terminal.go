package httpapi

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/terminal"
)

func (api *API) handleTerminalInput(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Text          string `json:"text"`
		AppendNewline bool   `json:"append_newline,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.Terminals.SendInput(r.PathValue("widgetID"), payload.Text, payload.AppendNewline)
	if err != nil {
		writeTerminalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleTerminalSnapshot(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	from := uint64(parseInt(r.URL.Query().Get("from"), 0))
	snapshot, err := api.runtime.TerminalSnapshot(widgetID, from)
	if err != nil {
		writeTerminalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleTerminalDiagnostics(w http.ResponseWriter, r *http.Request) {
	diagnostics, err := api.runtime.TerminalDiagnostics(r.PathValue("widgetID"))
	if err != nil {
		writeTerminalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, diagnostics)
}

func (api *API) handleTerminalLatestCommand(w http.ResponseWriter, r *http.Request) {
	command, err := api.runtime.TerminalLatestCommand(r.PathValue("widgetID"))
	if err != nil {
		writeTerminalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, command)
}

func (api *API) handleTerminalSessionCatalog(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, api.runtime.TerminalSessionCatalog())
}

func (api *API) handleCreateTerminalSession(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	snapshot, err := api.runtime.CreateTerminalSiblingSession(r.Context(), widgetID)
	if err != nil {
		api.appendTerminalControlAudit("terminal.session.create", "", widgetID, "", "", err)
		writeTerminalError(w, err)
		return
	}
	api.appendTerminalControlAudit(
		"terminal.session.create",
		"",
		widgetID,
		snapshot.ActiveSessionID,
		snapshot.State.ConnectionID,
		nil,
	)
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleSetActiveTerminalSession(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	var payload struct {
		SessionID string `json:"session_id"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	snapshot, err := api.runtime.FocusTerminalSession(widgetID, payload.SessionID)
	if err != nil {
		api.appendTerminalControlAudit("terminal.session.focus", "", widgetID, payload.SessionID, "", err)
		writeTerminalError(w, err)
		return
	}
	api.appendTerminalControlAudit(
		"terminal.session.focus",
		"",
		widgetID,
		payload.SessionID,
		snapshot.State.ConnectionID,
		nil,
	)
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleCloseTerminalSession(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	sessionID := r.PathValue("sessionID")
	connectionID := api.terminalAuditConnectionID(widgetID)
	snapshot, err := api.runtime.CloseTerminalSession(widgetID, sessionID)
	if err != nil {
		api.appendTerminalControlAudit("terminal.session.close", "", widgetID, sessionID, connectionID, err)
		writeTerminalError(w, err)
		return
	}
	api.appendTerminalControlAudit("terminal.session.close", "", widgetID, sessionID, connectionID, nil)
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleTerminalInterrupt(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	connectionID := api.terminalAuditConnectionID(widgetID)
	if err := api.runtime.Terminals.Interrupt(widgetID); err != nil {
		api.appendTerminalControlAudit("terminal.interrupt", "", widgetID, "", connectionID, err)
		writeTerminalError(w, err)
		return
	}

	snapshot, err := api.runtime.TerminalSnapshot(widgetID, math.MaxUint64)
	if err != nil {
		api.appendTerminalControlAudit("terminal.interrupt", "", widgetID, "", connectionID, err)
		writeTerminalError(w, err)
		return
	}

	api.appendTerminalControlAudit("terminal.interrupt", "", widgetID, snapshot.ActiveSessionID, snapshot.State.ConnectionID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"state": snapshot.State})
}

func (api *API) handleTerminalRestart(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	connectionID := api.terminalAuditConnectionID(widgetID)
	state, err := api.runtime.RestartTerminalSession(r.Context(), widgetID)
	if err != nil {
		api.appendTerminalControlAudit("terminal.restart", "", widgetID, "", connectionID, err)
		writeTerminalError(w, err)
		return
	}
	api.appendTerminalControlAudit("terminal.restart", "", widgetID, state.SessionID, state.ConnectionID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"state": state})
}

func (api *API) appendTerminalControlAudit(
	toolName string,
	summary string,
	widgetID string,
	sessionID string,
	connectionID string,
	err error,
) {
	if api == nil || api.runtime == nil {
		return
	}
	if strings.TrimSpace(connectionID) == "" {
		connectionID = api.terminalAuditConnectionID(widgetID)
	}
	api.runtime.AppendTerminalAudit(app.TerminalAuditInput{
		ToolName:           toolName,
		Summary:            summary,
		WidgetID:           widgetID,
		TargetSession:      sessionID,
		TargetConnectionID: connectionID,
		Success:            err == nil,
		Error:              err,
	})
}

func (api *API) terminalAuditConnectionID(widgetID string) string {
	if api == nil || api.runtime == nil {
		return ""
	}
	snapshot, err := api.runtime.TerminalSnapshot(widgetID, math.MaxUint64)
	if err != nil {
		return ""
	}
	return snapshot.State.ConnectionID
}

func (api *API) handleTerminalStream(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	from := uint64(parseInt(r.URL.Query().Get("from"), 0))
	snapshot, subscription, unsubscribe, err := api.runtime.Terminals.SnapshotAndSubscribe(widgetID, from)
	if err != nil {
		writeTerminalError(w, err)
		return
	}
	defer unsubscribe()

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming_unsupported", "streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	for _, chunk := range snapshot.Chunks {
		writeEvent(w, "output", chunk)
	}
	flusher.Flush()

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		case chunk, ok := <-subscription:
			if !ok {
				return
			}
			writeEvent(w, "output", chunk)
			flusher.Flush()
		}
	}
}

func writeTerminalError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, terminal.ErrWidgetNotFound):
		writeNotFound(w, "widget_not_found", err.Error())
	case errors.Is(err, terminal.ErrSessionNotFound):
		writeNotFound(w, "session_not_found", err.Error())
	case errors.Is(err, terminal.ErrCommandNotFound):
		writeNotFound(w, "terminal_command_not_found", err.Error())
	case errors.Is(err, connections.ErrConnectionNotFound):
		writeNotFound(w, "connection_not_found", err.Error())
	case errors.Is(err, terminal.ErrCannotSendInput),
		errors.Is(err, terminal.ErrCannotInterrupt),
		errors.Is(err, terminal.ErrCannotCloseLastSession):
		writeBadRequest(w, "invalid_terminal_state", err)
	default:
		writeInternalError(w, err)
	}
}
