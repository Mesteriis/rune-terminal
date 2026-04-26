package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestListMCPCatalogReturnsTemplates(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/mcp/catalog", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Templates []struct {
			ID          string `json:"id"`
			DisplayName string `json:"display_name"`
		} `json:"templates"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json.Unmarshal error: %v", err)
	}
	if len(payload.Templates) == 0 {
		t.Fatalf("expected non-empty template catalog, got %#v", payload)
	}
	if payload.Templates[0].ID == "" || payload.Templates[0].DisplayName == "" {
		t.Fatalf("expected template metadata, got %#v", payload.Templates[0])
	}
}

func TestProbeMCPServerRejectsInvalidDraft(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/mcp/probe", map[string]any{
		"endpoint": "/not-absolute",
	}))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("json.Unmarshal error: %v", err)
	}
	if payload.Error.Code != "invalid_mcp_request" {
		t.Fatalf("unexpected error code: %#v", payload)
	}
}
