package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWindowTitleSettingsEndpointsListAndUpdate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	getRecorder := httptest.NewRecorder()
	handler.ServeHTTP(getRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/settings/window-title", nil))
	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 get, got %d (%s)", getRecorder.Code, getRecorder.Body.String())
	}

	var initial struct {
		AutoTitle string `json:"auto_title"`
		Settings  struct {
			Mode        string `json:"mode"`
			CustomTitle string `json:"custom_title"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(getRecorder.Body.Bytes(), &initial); err != nil {
		t.Fatalf("unmarshal initial settings: %v", err)
	}
	if initial.Settings.Mode != "auto" || initial.Settings.CustomTitle != "" {
		t.Fatalf("unexpected initial settings: %#v", initial)
	}
	if initial.AutoTitle == "" {
		t.Fatalf("expected non-empty auto title")
	}

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/settings/window-title", map[string]any{
		"mode":         "custom",
		"custom_title": "Ops Shell Window",
	}))
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 update, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	var updated struct {
		Settings struct {
			Mode        string `json:"mode"`
			CustomTitle string `json:"custom_title"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(updateRecorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal updated settings: %v", err)
	}
	if updated.Settings.Mode != "custom" || updated.Settings.CustomTitle != "Ops Shell Window" {
		t.Fatalf("unexpected updated settings: %#v", updated)
	}

	resetRecorder := httptest.NewRecorder()
	handler.ServeHTTP(resetRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/settings/window-title", map[string]any{
		"mode": "auto",
	}))
	if resetRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 reset, got %d (%s)", resetRecorder.Code, resetRecorder.Body.String())
	}
	if err := json.Unmarshal(resetRecorder.Body.Bytes(), &updated); err != nil {
		t.Fatalf("unmarshal reset settings: %v", err)
	}
	if updated.Settings.Mode != "auto" || updated.Settings.CustomTitle != "" {
		t.Fatalf("expected auto reset settings, got %#v", updated)
	}
}

func TestBootstrapIncludesComposedWindowTitle(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/settings/window-title", map[string]any{
		"mode":         "custom",
		"custom_title": "Ops Window",
	}))
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 update, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	bootstrapRecorder := httptest.NewRecorder()
	handler.ServeHTTP(bootstrapRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/bootstrap", nil))
	if bootstrapRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 bootstrap, got %d (%s)", bootstrapRecorder.Code, bootstrapRecorder.Body.String())
	}

	var payload struct {
		WindowTitle string `json:"window_title"`
	}
	if err := json.Unmarshal(bootstrapRecorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal bootstrap payload: %v", err)
	}
	if payload.WindowTitle != "Ops Window" {
		t.Fatalf("expected custom bootstrap title, got %#v", payload)
	}
}
