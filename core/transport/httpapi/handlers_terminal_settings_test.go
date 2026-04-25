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
		"font_size": 15,
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
			FontSize int `json:"font_size"`
		} `json:"settings"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if payload.Settings.FontSize != 15 {
		t.Fatalf("expected persisted font size 15, got %d", payload.Settings.FontSize)
	}
}

func TestUpdateTerminalSettingsRequiresFontSize(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	req := authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{})
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}
