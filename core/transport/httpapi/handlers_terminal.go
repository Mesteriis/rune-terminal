package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"time"

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
	snapshot, err := api.runtime.Terminals.Snapshot(widgetID, from)
	if err != nil {
		writeTerminalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func (api *API) handleTerminalStream(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	from := uint64(parseInt(r.URL.Query().Get("from"), 0))
	snapshot, err := api.runtime.Terminals.Snapshot(widgetID, from)
	if err != nil {
		writeTerminalError(w, err)
		return
	}
	subscription, unsubscribe, err := api.runtime.Terminals.Subscribe(widgetID)
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
	case errors.Is(err, terminal.ErrCannotSendInput), errors.Is(err, terminal.ErrCannotInterrupt):
		writeBadRequest(w, "invalid_terminal_state", err)
	default:
		writeInternalError(w, err)
	}
}
