package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLocaleSettingsEndpointsListAndUpdate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	getRecorder := httptest.NewRecorder()
	handler.ServeHTTP(getRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/settings/locale", nil))
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 get, got %d (%s)", getRecorder.Code, getRecorder.Body.String())
	}

	var initial struct {
		Settings struct {
			Locale string `json:"locale"`
		} `json:"settings"`
		SupportedLocales []string `json:"supported_locales"`
	}
	if err := json.Unmarshal(getRecorder.Body.Bytes(), &initial); err != nil {
		t.Fatalf("unmarshal initial settings: %v", err)
	}
	if initial.Settings.Locale != "ru" {
		t.Fatalf("expected default locale ru, got %#v", initial)
	}
	if len(initial.SupportedLocales) != 4 {
		t.Fatalf("expected supported locales payload, got %#v", initial.SupportedLocales)
	}

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/settings/locale", map[string]any{
		"locale": "cn",
	}))
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 update, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	var updated struct {
		Settings struct {
			Locale string `json:"locale"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(updateRecorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated settings: %v", err)
	}
	if updated.Settings.Locale != "zh-CN" {
		t.Fatalf("expected zh-CN locale, got %#v", updated)
	}

	englishRecorder := httptest.NewRecorder()
	handler.ServeHTTP(englishRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/settings/locale", map[string]any{
		"locale": "en",
	}))
	if englishRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 english update, got %d (%s)", englishRecorder.Code, englishRecorder.Body.String())
	}

	var english struct {
		Settings struct {
			Locale string `json:"locale"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(englishRecorder.Body.Bytes(), &english); err != nil {
		t.Fatalf("unmarshal english settings: %v", err)
	}
	if english.Settings.Locale != "en" {
		t.Fatalf("expected english locale, got %#v", english)
	}
}
