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
	fields := windowTitleSettingsPayloadFields(payload)
	if payload.Mode == nil && payload.CustomTitle == nil {
		err := errors.New("mode or custom_title is required")
		api.appendSettingsAudit("window_title", fields, false, err)
		writeBadRequest(w, "invalid_request", err)
		return
	}

	current, err := api.runtime.WindowTitleSettings(r.Context())
	if err != nil {
		api.appendSettingsAudit("window_title", fields, false, err)
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
		api.appendSettingsAudit("window_title", fields, false, err)
		writeInternalError(w, err)
		return
	}
	api.appendSettingsAudit("window_title", fields, true, nil)

	writeJSON(w, http.StatusOK, map[string]any{
		"settings":   settings,
		"auto_title": api.runtime.AutoWindowTitleLabel(),
	})
}

func windowTitleSettingsPayloadFields(payload updateWindowTitleSettingsPayload) []string {
	fields := make([]string, 0, 2)
	if payload.Mode != nil {
		fields = append(fields, "mode")
	}
	if payload.CustomTitle != nil {
		fields = append(fields, "custom_title")
	}
	return fields
}
