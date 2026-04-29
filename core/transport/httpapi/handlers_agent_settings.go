package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

type updateAgentSettingsPayload struct {
	ComposerSubmitMode *string `json:"composer_submit_mode"`
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
	if payload.ComposerSubmitMode == nil {
		err := errors.New("composer_submit_mode is required")
		api.appendSettingsAudit("agent", fields, false, err)
		writeBadRequest(w, "invalid_request", err)
		return
	}

	settings, err := api.runtime.UpdateAgentSettings(r.Context(), agent.ComposerPreferences{
		SubmitMode: *payload.ComposerSubmitMode,
	})
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
	if payload.ComposerSubmitMode == nil {
		return nil
	}
	return []string{"composer_submit_mode"}
}
