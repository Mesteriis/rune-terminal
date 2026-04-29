package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

func TestAgentCatalogReturnsActiveSelection(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var catalog agent.Catalog
	if err := json.Unmarshal(recorder.Body.Bytes(), &catalog); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if catalog.Active.Profile.ID != "balanced" || catalog.Active.Role.ID != "developer" || catalog.Active.Mode.ID != "implement" {
		t.Fatalf("unexpected active selection: %#v", catalog.Active)
	}
}

func TestAgentSelectionEndpointsUpdateActiveState(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	for _, requestSpec := range []struct {
		path string
		id   string
	}{
		{path: "/api/v1/agent/selection/profile", id: "hardened"},
		{path: "/api/v1/agent/selection/role", id: "reviewer"},
		{path: "/api/v1/agent/selection/mode", id: "review"},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, requestSpec.path, map[string]string{"id": requestSpec.id}))
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200 for %s, got %d", requestSpec.path, recorder.Code)
		}
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent", nil))

	var catalog agent.Catalog
	if err := json.Unmarshal(recorder.Body.Bytes(), &catalog); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if catalog.Active.Profile.ID != "hardened" || catalog.Active.Role.ID != "reviewer" || catalog.Active.Mode.ID != "review" {
		t.Fatalf("unexpected active selection: %#v", catalog.Active)
	}
}

func TestAgentSelectionEndpointsAppendAuditEvents(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	for _, requestSpec := range []struct {
		path string
		id   string
	}{
		{path: "/api/v1/agent/selection/profile", id: "hardened"},
		{path: "/api/v1/agent/selection/role", id: "reviewer"},
		{path: "/api/v1/agent/selection/mode", id: "review"},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, requestSpec.path, map[string]string{"id": requestSpec.id}))
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200 for %s, got %d (%s)", requestSpec.path, recorder.Code, recorder.Body.String())
		}
	}

	events := decodeAgentSelectionAuditEvents(t, handler)
	expectedTools := []string{
		"agent.selection.profile",
		"agent.selection.role",
		"agent.selection.mode",
	}
	if len(events) != len(expectedTools) {
		t.Fatalf("expected %d selection audit events, got %#v", len(expectedTools), events)
	}
	for index, expectedTool := range expectedTools {
		event := events[index]
		if event.ToolName != expectedTool || event.ActionSource != "http.agent.selection" || !event.Success || event.Error != "" {
			t.Fatalf("unexpected selection audit event %d: %#v", index, event)
		}
		if event.PromptProfileID == "" || event.RoleID == "" || event.ModeID == "" || event.SecurityPosture == "" {
			t.Fatalf("expected effective selection fields in audit event %d: %#v", index, event)
		}
	}
	if events[0].Summary != "selection=profile selected_id=hardened" || events[0].PromptProfileID != "hardened" {
		t.Fatalf("unexpected profile audit event: %#v", events[0])
	}
	if events[1].Summary != "selection=role selected_id=reviewer" || events[1].RoleID != "reviewer" {
		t.Fatalf("unexpected role audit event: %#v", events[1])
	}
	if events[2].Summary != "selection=mode selected_id=review" || events[2].ModeID != "review" {
		t.Fatalf("unexpected mode audit event: %#v", events[2])
	}
}

func TestAgentSelectionEndpointsReturnNotFoundForUnknownIDs(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, "/api/v1/agent/selection/mode", map[string]string{"id": "unknown"}))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}

func TestAgentSelectionEndpointsAppendFailureAuditEvents(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, "/api/v1/agent/selection/mode", map[string]string{"id": "unknown"}))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
	events := decodeAgentSelectionAuditEvents(t, handler)
	if len(events) != 1 {
		t.Fatalf("expected one selection failure audit event, got %#v", events)
	}
	event := events[0]
	if event.ToolName != "agent.selection.mode" || event.ActionSource != "http.agent.selection" ||
		event.Success || event.Error == "" {
		t.Fatalf("unexpected selection failure audit event: %#v", event)
	}
	if event.Summary != "selection=mode selected_id=unknown" || event.ModeID != "implement" {
		t.Fatalf("expected attempted id and current selection in failure audit event, got %#v", event)
	}
}

type agentSelectionAuditEvent struct {
	ToolName        string `json:"tool_name"`
	Summary         string `json:"summary"`
	ActionSource    string `json:"action_source"`
	PromptProfileID string `json:"prompt_profile_id"`
	RoleID          string `json:"role_id"`
	ModeID          string `json:"mode_id"`
	SecurityPosture string `json:"security_posture"`
	Success         bool   `json:"success"`
	Error           string `json:"error"`
}

func decodeAgentSelectionAuditEvents(t *testing.T, handler http.Handler) []agentSelectionAuditEvent {
	t.Helper()

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/audit?limit=10", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected audit 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}
	var response struct {
		Events []agentSelectionAuditEvent `json:"events"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}
	return response.Events
}
