package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/locale"
)

type updateLocaleSettingsPayload struct {
	Locale *string `json:"locale"`
}

func (api *API) handleLocaleSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := api.runtime.LocaleSettings(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings":          settings,
		"supported_locales": locale.SupportedLocales(),
	})
}

func (api *API) handleUpdateLocaleSettings(w http.ResponseWriter, r *http.Request) {
	var payload updateLocaleSettingsPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}
	if payload.Locale == nil {
		writeBadRequest(w, "invalid_request", errors.New("locale is required"))
		return
	}

	settings, err := api.runtime.UpdateLocaleSettings(r.Context(), locale.Settings{
		Locale: *payload.Locale,
	})
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"settings":          settings,
		"supported_locales": locale.SupportedLocales(),
	})
}
