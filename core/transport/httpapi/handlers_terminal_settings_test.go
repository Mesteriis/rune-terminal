package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestTerminalSettingsRouteReturnsPersistedFontSize(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	updateRequest := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{
		"font_size":   15,
		"line_height": 1.35,
		"theme_mode":  "contrast",
		"scrollback":  6000,
	})
	handler.ServeHTTP(updateRecorder, updateRequest)
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodGet, "/api/v1/settings/terminal", nil)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			FontSize   int     `json:"font_size"`
			LineHeight float64 `json:"line_height"`
			ThemeMode  string  `json:"theme_mode"`
			Scrollback int     `json:"scrollback"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.FontSize != 15 {
		t.Fatalf("expected persisted font size 15, got %d", payload.Settings.FontSize)
	}
	if payload.Settings.LineHeight != 1.35 {
		t.Fatalf("expected persisted line height 1.35, got %.2f", payload.Settings.LineHeight)
	}
	if payload.Settings.ThemeMode != "contrast" {
		t.Fatalf("expected persisted theme mode contrast, got %q", payload.Settings.ThemeMode)
	}
	if payload.Settings.Scrollback != 6000 {
		t.Fatalf("expected persisted scrollback 6000, got %d", payload.Settings.Scrollback)
	}
}

func TestUpdateTerminalSettingsRequiresKnownField(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{})
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestUpdateTerminalSettingsSupportsPartialLineHeightUpdate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	updateRequest := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{
		"line_height": 1.45,
	})
	handler.ServeHTTP(updateRecorder, updateRequest)
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodGet, "/api/v1/settings/terminal", nil)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			FontSize   int     `json:"font_size"`
			LineHeight float64 `json:"line_height"`
			ThemeMode  string  `json:"theme_mode"`
			Scrollback int     `json:"scrollback"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.FontSize != 13 {
		t.Fatalf("expected unchanged font size 13, got %d", payload.Settings.FontSize)
	}
	if payload.Settings.LineHeight != 1.45 {
		t.Fatalf("expected persisted line height 1.45, got %.2f", payload.Settings.LineHeight)
	}
	if payload.Settings.ThemeMode != "adaptive" {
		t.Fatalf("expected unchanged theme mode adaptive, got %q", payload.Settings.ThemeMode)
	}
	if payload.Settings.Scrollback != 5000 {
		t.Fatalf("expected unchanged scrollback 5000, got %d", payload.Settings.Scrollback)
	}
}

func TestUpdateTerminalSettingsSupportsPartialThemeUpdate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	updateRequest := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{
		"theme_mode": "contrast",
	})
	handler.ServeHTTP(updateRecorder, updateRequest)
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodGet, "/api/v1/settings/terminal", nil)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			FontSize   int     `json:"font_size"`
			LineHeight float64 `json:"line_height"`
			ThemeMode  string  `json:"theme_mode"`
			Scrollback int     `json:"scrollback"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.FontSize != 13 {
		t.Fatalf("expected unchanged font size 13, got %d", payload.Settings.FontSize)
	}
	if payload.Settings.LineHeight != 1.25 {
		t.Fatalf("expected unchanged line height 1.25, got %.2f", payload.Settings.LineHeight)
	}
	if payload.Settings.ThemeMode != "contrast" {
		t.Fatalf("expected persisted theme mode contrast, got %q", payload.Settings.ThemeMode)
	}
	if payload.Settings.Scrollback != 5000 {
		t.Fatalf("expected unchanged scrollback 5000, got %d", payload.Settings.Scrollback)
	}
}

func TestUpdateTerminalSettingsSupportsPartialScrollbackUpdate(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	updateRecorder := httptest.NewRecorder()
	updateRequest := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{
		"scrollback": 8000,
	})
	handler.ServeHTTP(updateRecorder, updateRequest)
	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d (%s)", updateRecorder.Code, updateRecorder.Body.String())
	}

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodGet, "/api/v1/settings/terminal", nil)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Settings struct {
			FontSize   int     `json:"font_size"`
			LineHeight float64 `json:"line_height"`
			ThemeMode  string  `json:"theme_mode"`
			Scrollback int     `json:"scrollback"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.FontSize != 13 {
		t.Fatalf("expected unchanged font size 13, got %d", payload.Settings.FontSize)
	}
	if payload.Settings.LineHeight != 1.25 {
		t.Fatalf("expected unchanged line height 1.25, got %.2f", payload.Settings.LineHeight)
	}
	if payload.Settings.ThemeMode != "adaptive" {
		t.Fatalf("expected unchanged theme mode adaptive, got %q", payload.Settings.ThemeMode)
	}
	if payload.Settings.Scrollback != 8000 {
		t.Fatalf("expected persisted scrollback 8000, got %d", payload.Settings.Scrollback)
	}
}
