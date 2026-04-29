package httpapi

import (
	"net/http"
	"path/filepath"
	"strings"

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
		api.appendConnectionAudit(
			"remote_profiles.save",
			"Save remote profile",
			"http.remote_profiles",
			payload.ID,
			nil,
			err,
		)
		writeConnectionError(w, err)
		return
	}
	api.appendConnectionAudit(
		"remote_profiles.save",
		"Save remote profile",
		"http.remote_profiles",
		profile.ID,
		nil,
		nil,
	)
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
		api.appendConnectionAudit(
			"remote_profiles.import_ssh_config",
			"Import remote profiles from SSH config",
			"http.remote_profiles",
			"",
			[]string{api.remoteProfilesImportAuditPath(payload.Path)},
			err,
		)
		writeConnectionError(w, err)
		return
	}
	api.appendConnectionAudit(
		"remote_profiles.import_ssh_config",
		"Import remote profiles from SSH config",
		"http.remote_profiles",
		"",
		[]string{api.remoteProfilesImportAuditPath(payload.Path)},
		nil,
	)
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleDeleteRemoteProfile(w http.ResponseWriter, r *http.Request) {
	profileID := r.PathValue("profileID")
	profiles, err := api.runtime.DeleteRemoteProfile(profileID)
	if err != nil {
		api.appendConnectionAudit(
			"remote_profiles.delete",
			"Delete remote profile",
			"http.remote_profiles",
			profileID,
			nil,
			err,
		)
		writeConnectionError(w, err)
		return
	}
	api.appendConnectionAudit(
		"remote_profiles.delete",
		"Delete remote profile",
		"http.remote_profiles",
		profileID,
		nil,
		nil,
	)
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

func (api *API) remoteProfilesImportAuditPath(rawPath string) string {
	path := strings.TrimSpace(rawPath)
	if path != "" {
		return path
	}
	if api == nil || api.runtime == nil {
		return ""
	}
	return filepath.Join(api.runtime.HomeDir, ".ssh", "config")
}
