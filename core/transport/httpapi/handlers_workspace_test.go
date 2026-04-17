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

func TestWorkspaceCreateSplitTerminalWidgetRejectsInvalidDirection(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/split", map[string]any{
		"tab_id":           "tab-main",
		"target_widget_id": "term-main",
		"direction":        "diagonal",
	}))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestWorkspaceMoveWidgetBySplitRejectsInvalidDirection(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/move-split", map[string]any{
		"tab_id":           "tab-main",
		"widget_id":        "term-main",
		"target_widget_id": "term-side",
		"direction":        "diagonal",
	}))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestWorkspaceUpdateLayout(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPatch, "/api/v1/workspace/layout", map[string]any{
		"layout": map[string]any{
			"id":   "layout-focused",
			"mode": "focus",
			"surfaces": []map[string]any{
				{"id": "terminal", "region": "main"},
				{"id": "ai", "region": "sidebar"},
			},
			"active_surface_id": "ai",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Workspace struct {
			Layout struct {
				ID              string `json:"id"`
				Mode            string `json:"mode"`
				ActiveSurfaceID string `json:"active_surface_id"`
				Surfaces        []struct {
					ID string `json:"id"`
				} `json:"surfaces"`
			} `json:"layout"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Workspace.Layout.ID != "layout-focused" {
		t.Fatalf("unexpected layout id: %#v", response.Workspace.Layout)
	}
	if response.Workspace.Layout.Mode != "focus" {
		t.Fatalf("unexpected layout mode: %#v", response.Workspace.Layout)
	}
	if response.Workspace.Layout.ActiveSurfaceID != "ai" {
		t.Fatalf("unexpected layout active surface: %#v", response.Workspace.Layout)
	}
	if len(response.Workspace.Layout.Surfaces) != 2 {
		t.Fatalf("expected two layout surfaces, got %#v", response.Workspace.Layout.Surfaces)
	}
}

func TestWorkspaceSaveAndSwitchLayout(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/layouts/save", map[string]any{}))
	if recorder.Code != http.StatusOK {
		t.Fatalf("save layout expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var saveResponse struct {
		Workspace struct {
			ActiveLayoutID string `json:"active_layout_id"`
			Layouts        []struct {
				ID string `json:"id"`
			} `json:"layouts"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &saveResponse); err != nil {
		t.Fatalf("save layout unmarshal error: %v", err)
	}
	if len(saveResponse.Workspace.Layouts) < 2 {
		t.Fatalf("expected at least two layouts after save, got %#v", saveResponse.Workspace.Layouts)
	}
	savedLayoutID := saveResponse.Workspace.ActiveLayoutID
	if savedLayoutID == "" {
		t.Fatalf("expected active saved layout id")
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/layouts/switch", map[string]any{
		"layout_id": "layout-default",
	}))
	if recorder.Code != http.StatusOK {
		t.Fatalf("switch layout expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var switchResponse struct {
		Workspace struct {
			ActiveLayoutID string `json:"active_layout_id"`
			Layout         struct {
				ID string `json:"id"`
			} `json:"layout"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &switchResponse); err != nil {
		t.Fatalf("switch layout unmarshal error: %v", err)
	}
	if switchResponse.Workspace.ActiveLayoutID != "layout-default" {
		t.Fatalf("expected default active layout after switch, got %#v", switchResponse.Workspace)
	}
	if switchResponse.Workspace.Layout.ID != "layout-default" {
		t.Fatalf("expected default layout payload after switch, got %#v", switchResponse.Workspace.Layout)
	}
}

func TestWorkspaceLayoutSwitchKeepsActiveTabAndWidget(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/focus-tab", map[string]any{
		"tab_id": "tab-ops",
	}))
	if recorder.Code != http.StatusOK {
		t.Fatalf("focus tab expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/layouts/save", map[string]any{
		"layout_id": "layout-temporary",
	}))
	if recorder.Code != http.StatusOK {
		t.Fatalf("save layout expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/layouts/switch", map[string]any{
		"layout_id": "layout-default",
	}))
	if recorder.Code != http.StatusOK {
		t.Fatalf("switch layout expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Workspace struct {
			ActiveTabID    string `json:"active_tab_id"`
			ActiveWidgetID string `json:"active_widget_id"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("switch layout unmarshal error: %v", err)
	}
	if response.Workspace.ActiveTabID != "tab-ops" {
		t.Fatalf("expected active tab tab-ops after layout switch, got %q", response.Workspace.ActiveTabID)
	}
	if response.Workspace.ActiveWidgetID != "term-side" {
		t.Fatalf("expected active widget term-side after layout switch, got %q", response.Workspace.ActiveWidgetID)
	}
}
