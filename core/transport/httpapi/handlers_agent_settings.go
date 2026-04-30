package httpapi

import (
	"errors"
	"net/http"
)

type updateAgentSettingsPayload struct {
	ComposerSubmitMode *string `json:"composer_submit_mode"`
	DebugModeEnabled   *bool   `json:"debug_mode_enabled"`
}

func (api *API) handleAgentSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := api.runtime.AgentSettings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings": settings,
	})
}

func (api *API) handleUpdateAgentSettings(w http.ResponseWriter, r *http.Request) {
	var payload updateAgentSettingsPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	fields := agentSettingsPayloadFields(payload)
	if payload.ComposerSubmitMode == nil && payload.DebugModeEnabled == nil {
		err := errors.New("at least one agent settings field is required")
		api.appendSettingsAudit("agent", fields, false, err)
		writeBadRequest(w, "invalid_request", err)
		return
	}

	currentSettings, err := api.runtime.AgentSettings(r.Context())
	if err != nil {
		api.appendSettingsAudit("agent", fields, false, err)
		writeInternalError(w, err)
		return
	}

	nextSettings := currentSettings
	if payload.ComposerSubmitMode != nil {
		nextSettings.SubmitMode = *payload.ComposerSubmitMode
	}
	if payload.DebugModeEnabled != nil {
		nextSettings.DebugModeEnabled = *payload.DebugModeEnabled
	}

	settings, err := api.runtime.UpdateAgentSettings(r.Context(), nextSettings)
	if err != nil {
		api.appendSettingsAudit("agent", fields, false, err)
		writeInternalError(w, err)
		return
	}
	api.appendSettingsAudit("agent", fields, true, nil)

	writeJSON(w, http.StatusOK, map[string]any{
		"settings": settings,
	})
}

func agentSettingsPayloadFields(payload updateAgentSettingsPayload) []string {
	fields := make([]string, 0, 2)
	if payload.ComposerSubmitMode != nil {
		fields = append(fields, "composer_submit_mode")
	}
	if payload.DebugModeEnabled != nil {
		fields = append(fields, "debug_mode_enabled")
	}
	return fields
}
