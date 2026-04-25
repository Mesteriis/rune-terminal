package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/terminal"
)

type updateTerminalSettingsPayload struct {
	FontSize   *int     `json:"font_size"`
	LineHeight *float64 `json:"line_height"`
	ThemeMode  *string  `json:"theme_mode"`
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
	if payload.FontSize == nil && payload.LineHeight == nil && payload.ThemeMode == nil {
		writeBadRequest(w, "invalid_request", errors.New("font_size, line_height, or theme_mode is required"))
		return
	}

	current, err := api.runtime.TerminalSettings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	next := current
	if payload.FontSize != nil {
		next.FontSize = *payload.FontSize
	}
	if payload.LineHeight != nil {
		next.LineHeight = *payload.LineHeight
	}
	if payload.ThemeMode != nil {
		next.ThemeMode = *payload.ThemeMode
	}

	settings, err := api.runtime.UpdateTerminalSettings(r.Context(), terminal.Preferences(next))
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings": settings,
	})
}
