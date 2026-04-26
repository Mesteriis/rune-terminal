package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/windowtitle"
)

type updateWindowTitleSettingsPayload struct {
	Mode        *string `json:"mode"`
	CustomTitle *string `json:"custom_title"`
}

func (api *API) handleWindowTitleSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := api.runtime.WindowTitleSettings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings":   settings,
		"auto_title": api.runtime.AutoWindowTitleLabel(),
	})
}

func (api *API) handleUpdateWindowTitleSettings(w http.ResponseWriter, r *http.Request) {
	var payload updateWindowTitleSettingsPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.Mode == nil && payload.CustomTitle == nil {
		writeBadRequest(w, "invalid_request", errors.New("mode or custom_title is required"))
		return
	}

	current, err := api.runtime.WindowTitleSettings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	next := current
	if payload.Mode != nil {
		next.Mode = *payload.Mode
		if *payload.Mode == windowtitle.ModeAuto && payload.CustomTitle == nil {
			next.CustomTitle = ""
		}
	}
	if payload.CustomTitle != nil {
		next.CustomTitle = *payload.CustomTitle
	}

	settings, err := api.runtime.UpdateWindowTitleSettings(r.Context(), windowtitle.Settings(next))
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings":   settings,
		"auto_title": api.runtime.AutoWindowTitleLabel(),
	})
}
