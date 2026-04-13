package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

type selectionPayload struct {
	ID string `json:"id"`
}

func (api *API) handleAgentCatalog(w http.ResponseWriter, r *http.Request) {
	catalog, err := api.runtime.Agent.Catalog()
	if err != nil {
		writeAgentError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, catalog)
}

func (api *API) handleSetActiveProfile(w http.ResponseWriter, r *http.Request) {
	api.handleSelectionUpdate(w, r, api.runtime.Agent.SetActiveProfile)
}

func (api *API) handleSetActiveRole(w http.ResponseWriter, r *http.Request) {
	api.handleSelectionUpdate(w, r, api.runtime.Agent.SetActiveRole)
}

func (api *API) handleSetActiveMode(w http.ResponseWriter, r *http.Request) {
	api.handleSelectionUpdate(w, r, api.runtime.Agent.SetActiveMode)
}

func (api *API) handleSelectionUpdate(w http.ResponseWriter, r *http.Request, apply func(string) error) {
	var payload selectionPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.ID == "" {
		writeError(w, http.StatusBadRequest, "missing_id", "id is required")
		return
	}
	if err := apply(payload.ID); err != nil {
		writeAgentError(w, err)
		return
	}
	api.handleAgentCatalog(w, r)
}

func writeAgentError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, agent.ErrPromptProfileNotFound):
		writeNotFound(w, "prompt_profile_not_found", err.Error())
	case errors.Is(err, agent.ErrRolePresetNotFound):
		writeNotFound(w, "role_preset_not_found", err.Error())
	case errors.Is(err, agent.ErrWorkModeNotFound):
		writeNotFound(w, "work_mode_not_found", err.Error())
	default:
		writeInternalError(w, err)
	}
}
