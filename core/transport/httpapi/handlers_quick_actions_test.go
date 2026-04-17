package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestQuickActionsList(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/workflow/quick-actions", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Actions []struct {
			ID             string `json:"id"`
			InvocationPath string `json:"invocation_path"`
		} `json:"actions"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if len(response.Actions) == 0 {
		t.Fatalf("expected quick-action list")
	}
	if response.Actions[0].ID == "" || response.Actions[0].InvocationPath == "" {
		t.Fatalf("expected typed quick-action metadata, got %#v", response.Actions[0])
	}
}
