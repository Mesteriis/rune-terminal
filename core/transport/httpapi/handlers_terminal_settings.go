package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/terminal"
)

type updateTerminalSettingsPayload struct {
	FontSize *int `json:"font_size"`
}

func (api *API) handleTerminalSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := api.runtime.TerminalSettings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings": settings,
	})
}

func (api *API) handleUpdateTerminalSettings(w http.ResponseWriter, r *http.Request) {
	var payload updateTerminalSettingsPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.FontSize == nil {
		writeBadRequest(w, "invalid_request", errors.New("font_size is required"))
		return
	}

	settings, err := api.runtime.UpdateTerminalSettings(r.Context(), terminal.Preferences{
		FontSize: *payload.FontSize,
	})
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings": settings,
	})
}
