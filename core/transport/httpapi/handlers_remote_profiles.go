package httpapi

import (
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/connections"
)

func (api *API) handleListRemoteProfiles(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"profiles": api.runtime.ListRemoteProfiles(),
	})
}

func (api *API) handleSaveRemoteProfile(w http.ResponseWriter, r *http.Request) {
	var payload connections.SaveRemoteProfileInput
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	profile, profiles, err := api.runtime.SaveRemoteProfile(payload)
	if err != nil {
		writeConnectionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"profile":  profile,
		"profiles": profiles,
	})
}

func (api *API) handleImportRemoteProfilesFromSSHConfig(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Path string `json:"path,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.ImportRemoteProfilesFromSSHConfig(payload.Path)
	if err != nil {
		writeConnectionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleDeleteRemoteProfile(w http.ResponseWriter, r *http.Request) {
	profiles, err := api.runtime.DeleteRemoteProfile(r.PathValue("profileID"))
	if err != nil {
		writeConnectionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"profiles": profiles,
	})
}

func (api *API) handleListRemoteProfileTmuxSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := api.runtime.ListRemoteProfileTmuxSessions(r.Context(), r.PathValue("profileID"))
	if err != nil {
		writeConnectionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sessions": sessions,
	})
}

func (api *API) handleCreateRemoteSessionFromProfile(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Title       string `json:"title,omitempty"`
		TmuxSession string `json:"tmux_session,omitempty"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	result, err := api.runtime.CreateRemoteTerminalTabFromProfile(
		r.Context(),
		payload.Title,
		r.PathValue("profileID"),
		payload.TmuxSession,
	)
	if err != nil {
		writeWorkspaceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}
