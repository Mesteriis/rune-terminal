package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
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
	api.handleSelectionUpdate(w, r, "profile", api.runtime.Agent.SetActiveProfile)
}

func (api *API) handleSetActiveRole(w http.ResponseWriter, r *http.Request) {
	api.handleSelectionUpdate(w, r, "role", api.runtime.Agent.SetActiveRole)
}

func (api *API) handleSetActiveMode(w http.ResponseWriter, r *http.Request) {
	api.handleSelectionUpdate(w, r, "mode", api.runtime.Agent.SetActiveMode)
}

func (api *API) handleSelectionUpdate(w http.ResponseWriter, r *http.Request, action string, apply func(string) error) {
	var payload selectionPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.ID == "" {
		err := errors.New("id is required")
		api.appendAgentSelectionAudit(action, payload.ID, err)
		writeError(w, http.StatusBadRequest, "missing_id", "id is required")
		return
	}
	if err := apply(payload.ID); err != nil {
		api.appendAgentSelectionAudit(action, payload.ID, err)
		writeAgentError(w, err)
		return
	}
	api.appendAgentSelectionAudit(action, payload.ID, nil)
	api.handleAgentCatalog(w, r)
}

func (api *API) appendAgentSelectionAudit(action string, selectedID string, err error) {
	if api == nil || api.runtime == nil {
		return
	}
	var selection agent.Selection
	if api.runtime.Agent != nil {
		if currentSelection, selectionErr := api.runtime.Agent.Selection(); selectionErr == nil {
			selection = currentSelection
		}
	}
	api.runtime.AppendAgentSelectionAudit(app.AgentSelectionAuditInput{
		Action:     action,
		SelectedID: selectedID,
		Selection:  selection,
		Success:    err == nil,
		Error:      err,
	})
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
