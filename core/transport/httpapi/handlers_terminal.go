package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

func (api *API) handleTerminalInput(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Text          string `json:"text"`
		AppendNewline bool   `json:"append_newline,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	result, err := api.runtime.Terminals.SendInput(r.PathValue("widgetID"), payload.Text, payload.AppendNewline)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleTerminalStream(w http.ResponseWriter, r *http.Request) {
	widgetID := r.PathValue("widgetID")
	from := uint64(parseInt(r.URL.Query().Get("from"), 0))
	snapshot, err := api.runtime.Terminals.Snapshot(widgetID, from)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	subscription, unsubscribe, err := api.runtime.Terminals.Subscribe(widgetID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	defer unsubscribe()

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "streaming unsupported"})
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
