package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/plugins"
)

type pluginInstallPayload struct {
	Source struct {
		Kind string `json:"kind"`
		URL  string `json:"url"`
		Ref  string `json:"ref,omitempty"`
	} `json:"source"`
	Metadata map[string]string `json:"metadata,omitempty"`
	Access   struct {
		OwnerUsername string   `json:"owner_username,omitempty"`
		Visibility    string   `json:"visibility,omitempty"`
		AllowedUsers  []string `json:"allowed_users,omitempty"`
	} `json:"access,omitempty"`
}

func (api *API) handleListPlugins(w http.ResponseWriter, r *http.Request) {
	catalog, err := api.runtime.ListInstalledPlugins()
	if err != nil {
		writePluginCatalogError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, catalog)
}

func (api *API) handleInstallPlugin(w http.ResponseWriter, r *http.Request) {
	var payload pluginInstallPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	pluginRecord, catalog, err := api.runtime.InstallPlugin(r.Context(), app.InstallPluginInput{
		Source: app.PluginInstallSource{
			Kind: app.PluginInstallSourceKind(payload.Source.Kind),
			URL:  payload.Source.URL,
			Ref:  payload.Source.Ref,
		},
		Metadata: payload.Metadata,
		Access: app.PluginAccessPolicy{
			OwnerUsername: payload.Access.OwnerUsername,
			Visibility:    payload.Access.Visibility,
			AllowedUsers:  payload.Access.AllowedUsers,
		},
	})
	if err != nil {
		writePluginCatalogError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plugin":  pluginRecord,
		"plugins": catalog,
	})
}

func (api *API) handleEnablePlugin(w http.ResponseWriter, r *http.Request) {
	pluginRecord, catalog, err := api.runtime.SetPluginEnabled(r.PathValue("pluginID"), true)
	if err != nil {
		writePluginCatalogError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plugin":  pluginRecord,
		"plugins": catalog,
	})
}

func (api *API) handleDisablePlugin(w http.ResponseWriter, r *http.Request) {
	pluginRecord, catalog, err := api.runtime.SetPluginEnabled(r.PathValue("pluginID"), false)
	if err != nil {
		writePluginCatalogError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plugin":  pluginRecord,
		"plugins": catalog,
	})
}

func (api *API) handleUpdatePlugin(w http.ResponseWriter, r *http.Request) {
	pluginRecord, catalog, err := api.runtime.UpdateInstalledPlugin(r.Context(), r.PathValue("pluginID"))
	if err != nil {
		writePluginCatalogError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plugin":  pluginRecord,
		"plugins": catalog,
	})
}

func (api *API) handleDeletePlugin(w http.ResponseWriter, r *http.Request) {
	pluginRecord, catalog, err := api.runtime.DeleteInstalledPlugin(r.PathValue("pluginID"))
	if err != nil {
		writePluginCatalogError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plugin":  pluginRecord,
		"plugins": catalog,
	})
}

func writePluginCatalogError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, app.ErrPluginCatalogNotConfigured):
		writeServiceUnavailable(w, "plugin_catalog_not_configured", err.Error())
	case errors.Is(err, app.ErrPluginInstalled):
		writeError(w, http.StatusConflict, "plugin_already_installed", err.Error())
	case errors.Is(err, app.ErrPluginNotFound):
		writeNotFound(w, "plugin_not_found", err.Error())
	case errors.Is(err, plugins.ErrInvalidPluginSpec), errors.Is(err, plugins.ErrProcessSpawnFailed):
		writeBadRequest(w, "invalid_plugin_install", err)
	default:
		writeInternalError(w, err)
	}
}
