package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWorkspaceCloseTabBypassesToolPolicyPath(t *testing.T) {
	t.Parallel()

	handler, agentStore := newTestHandler(t)
	if err := agentStore.SetActiveMode("explore"); err != nil {
		t.Fatalf("SetActiveMode error: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/workspace/tabs/tab-ops", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		ClosedTabID string `json:"closed_tab_id"`
		Workspace   struct {
			Tabs []struct {
				ID string `json:"id"`
			} `json:"tabs"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.ClosedTabID != "tab-ops" {
		t.Fatalf("unexpected closed tab id: %#v", response)
	}
	if len(response.Workspace.Tabs) != 1 {
		t.Fatalf("expected 1 remaining tab, got %d", len(response.Workspace.Tabs))
	}
}

func TestWorkspaceFocusTabBypassesRestrictiveMode(t *testing.T) {
	t.Parallel()

	handler, agentStore := newTestHandler(t)
	if err := agentStore.SetActiveMode("explore"); err != nil {
		t.Fatalf("SetActiveMode error: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/focus-tab", map[string]any{
		"tab_id": "tab-ops",
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Workspace struct {
			ActiveTabID string `json:"active_tab_id"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Workspace.ActiveTabID != "tab-ops" {
		t.Fatalf("unexpected active tab: %#v", response)
	}
}

func TestWorkspaceCloseLastTabReturnsBadRequest(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/workspace/tabs/tab-ops", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected first close to succeed, got %d", recorder.Code)
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/workspace/tabs/tab-main", nil))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestWorkspaceCreateRemoteTabRejectsLocalTarget(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/tabs/remote", map[string]any{
		"title": "Remote Shell",
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}
