package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAgentSettingsRouteReturnsPersistedComposerSubmitMode(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	updateRequest := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/agent", map[string]any{
		"composer_submit_mode": "mod-enter-sends",
	})
	handler.ServeHTTP(updateRecorder, updateRequest)
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodGet, "/api/v1/settings/agent", nil)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			ComposerSubmitMode string `json:"composer_submit_mode"`
			DebugModeEnabled   bool   `json:"debug_mode_enabled"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.ComposerSubmitMode != "mod-enter-sends" {
		t.Fatalf("expected persisted composer submit mode mod-enter-sends, got %q", payload.Settings.ComposerSubmitMode)
	}
	if payload.Settings.DebugModeEnabled {
		t.Fatalf("expected debug mode disabled by default")
	}
}

func TestUpdateAgentSettingsRequiresKnownField(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/agent", map[string]any{})
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestUpdateAgentSettingsClampsUnknownSubmitModeToDefault(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/agent", map[string]any{
		"composer_submit_mode": "bogus",
	})
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			ComposerSubmitMode string `json:"composer_submit_mode"`
			DebugModeEnabled   bool   `json:"debug_mode_enabled"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.ComposerSubmitMode != "enter-sends" {
		t.Fatalf("expected clamped composer submit mode enter-sends, got %q", payload.Settings.ComposerSubmitMode)
	}
	if payload.Settings.DebugModeEnabled {
		t.Fatalf("expected debug mode to remain disabled")
	}
}

func TestUpdateAgentSettingsPersistsDebugModeFlag(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/agent", map[string]any{
		"debug_mode_enabled": true,
	})
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			ComposerSubmitMode string `json:"composer_submit_mode"`
			DebugModeEnabled   bool   `json:"debug_mode_enabled"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if !payload.Settings.DebugModeEnabled {
		t.Fatalf("expected debug mode enabled after update")
	}
	if payload.Settings.ComposerSubmitMode != "enter-sends" {
		t.Fatalf("expected submit mode preserved, got %q", payload.Settings.ComposerSubmitMode)
	}
}
