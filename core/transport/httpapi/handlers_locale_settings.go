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
	fields := localeSettingsPayloadFields(payload)
	if payload.Locale == nil {
		err := errors.New("locale is required")
		api.appendSettingsAudit("locale", fields, false, err)
		writeBadRequest(w, "invalid_request", err)
		return
	}

	settings, err := api.runtime.UpdateLocaleSettings(r.Context(), locale.Settings{
		Locale: *payload.Locale,
	})
	if err != nil {
		api.appendSettingsAudit("locale", fields, false, err)
		writeInternalError(w, err)
		return
	}
	api.appendSettingsAudit("locale", fields, true, nil)

	writeJSON(w, http.StatusOK, map[string]any{
		"settings":          settings,
		"supported_locales": locale.SupportedLocales(),
	})
}

func localeSettingsPayloadFields(payload updateLocaleSettingsPayload) []string {
	if payload.Locale == nil {
		return nil
	}
	return []string{"locale"}
}
