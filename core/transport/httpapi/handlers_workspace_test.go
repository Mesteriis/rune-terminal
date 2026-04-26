package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/workspace"
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

func TestWorkspaceWidgetKindsCatalog(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/workspace/widget-kinds", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		WidgetKinds []struct {
			Kind         string `json:"kind"`
			Status       string `json:"status"`
			RuntimeOwned bool   `json:"runtime_owned"`
			CanCreate    bool   `json:"can_create"`
			CreateRoute  string `json:"create_route"`
		} `json:"widget_kinds"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if len(response.WidgetKinds) != 6 {
		t.Fatalf("expected 6 widget kinds, got %#v", response.WidgetKinds)
	}
	if response.WidgetKinds[0].Kind != "terminal" || response.WidgetKinds[0].Status != "available" {
		t.Fatalf("expected terminal to be first available widget kind: %#v", response.WidgetKinds)
	}
	if !response.WidgetKinds[0].RuntimeOwned || !response.WidgetKinds[0].CanCreate {
		t.Fatalf("expected terminal to be backend-owned and creatable: %#v", response.WidgetKinds[0])
	}
	if response.WidgetKinds[0].CreateRoute != "/api/v1/workspace/tabs" {
		t.Fatalf("unexpected terminal create route: %#v", response.WidgetKinds[0])
	}
	if response.WidgetKinds[2].Kind != "commander" || response.WidgetKinds[2].Status != "frontend-local" {
		t.Fatalf("expected commander to be explicitly frontend-local: %#v", response.WidgetKinds)
	}
	if response.WidgetKinds[2].RuntimeOwned || response.WidgetKinds[2].CanCreate {
		t.Fatalf("commander must not be overclaimed as backend-owned yet: %#v", response.WidgetKinds[2])
	}
	if response.WidgetKinds[3].Kind != "preview" || response.WidgetKinds[3].Status != "available" {
		t.Fatalf("expected preview to be available as backend path handoff: %#v", response.WidgetKinds)
	}
	if !response.WidgetKinds[3].RuntimeOwned || response.WidgetKinds[3].CanCreate {
		t.Fatalf("preview should be backend-owned but not globally creatable: %#v", response.WidgetKinds[3])
	}
	if response.WidgetKinds[3].CreateRoute != "/api/v1/workspace/widgets/open-preview" {
		t.Fatalf("unexpected preview create route: %#v", response.WidgetKinds[3])
	}
}

func TestWorkspaceCloseLastTabReturnsEmptyWorkspace(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/workspace/tabs/tab-ops", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected first close to succeed, got %d", recorder.Code)
	}

	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/workspace/tabs/tab-main", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		ClosedTabID string `json:"closed_tab_id"`
		Workspace   struct {
			Tabs []struct {
				ID string `json:"id"`
			} `json:"tabs"`
			Widgets []struct {
				ID string `json:"id"`
			} `json:"widgets"`
			ActiveTabID    string `json:"active_tab_id"`
			ActiveWidgetID string `json:"active_widget_id"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.ClosedTabID != "tab-main" {
		t.Fatalf("unexpected closed tab id: %#v", response)
	}
	if len(response.Workspace.Tabs) != 0 {
		t.Fatalf("expected zero tabs, got %#v", response.Workspace.Tabs)
	}
	if len(response.Workspace.Widgets) != 0 {
		t.Fatalf("expected zero widgets, got %#v", response.Workspace.Widgets)
	}
	if response.Workspace.ActiveTabID != "" {
		t.Fatalf("expected empty active tab id, got %q", response.Workspace.ActiveTabID)
	}
	if response.Workspace.ActiveWidgetID != "" {
		t.Fatalf("expected empty active widget id, got %q", response.Workspace.ActiveWidgetID)
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

func TestWorkspaceOpenDirectoryInNewBlockCreatesFilesWidget(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/open-directory", map[string]any{
		"target_widget_id": "term-main",
		"path":             "/workspace/repo/docs",
		"connection_id":    "local",
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		WidgetID  string `json:"widget_id"`
		Workspace struct {
			ActiveWidgetID string `json:"active_widget_id"`
			Widgets        []struct {
				ID           string `json:"id"`
				Kind         string `json:"kind"`
				Path         string `json:"path"`
				ConnectionID string `json:"connection_id"`
			} `json:"widgets"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.WidgetID == "" {
		t.Fatalf("expected widget id in response: %#v", response)
	}
	if response.Workspace.ActiveWidgetID != response.WidgetID {
		t.Fatalf("expected new files widget to become active, got %#v", response)
	}

	found := false
	for _, widget := range response.Workspace.Widgets {
		if widget.ID != response.WidgetID {
			continue
		}
		found = true
		if widget.Kind != "files" {
			t.Fatalf("expected files widget kind, got %#v", widget)
		}
		if widget.Path != "/workspace/repo/docs" {
			t.Fatalf("expected files widget path to be preserved, got %#v", widget)
		}
		if widget.ConnectionID != "local" {
			t.Fatalf("expected files widget connection id local, got %#v", widget)
		}
	}
	if !found {
		t.Fatalf("expected to find created widget in workspace snapshot: %#v", response)
	}
}

func TestWorkspaceOpenPreviewInNewBlockCreatesPreviewWidget(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	previewPath := filepath.Join(repoRoot, "README.md")
	if err := os.WriteFile(previewPath, []byte("# Preview\n"), 0o600); err != nil {
		t.Fatalf("write preview file: %v", err)
	}
	handler := NewHandler(&app.Runtime{
		RepoRoot:  repoRoot,
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
	}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/open-preview", map[string]any{
		"target_widget_id": "term-main",
		"path":             previewPath,
		"connection_id":    "local",
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		WidgetID  string `json:"widget_id"`
		Workspace struct {
			ActiveWidgetID string `json:"active_widget_id"`
			Widgets        []struct {
				ID           string `json:"id"`
				Kind         string `json:"kind"`
				Path         string `json:"path"`
				ConnectionID string `json:"connection_id"`
			} `json:"widgets"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.WidgetID == "" {
		t.Fatalf("expected widget id in response: %#v", response)
	}
	if response.Workspace.ActiveWidgetID != response.WidgetID {
		t.Fatalf("expected new preview widget to become active, got %#v", response)
	}

	found := false
	for _, widget := range response.Workspace.Widgets {
		if widget.ID != response.WidgetID {
			continue
		}
		found = true
		if widget.Kind != "preview" {
			t.Fatalf("expected preview widget kind, got %#v", widget)
		}
		if widget.Path != previewPath {
			t.Fatalf("expected preview widget path to be preserved, got %#v", widget)
		}
		if widget.ConnectionID != "local" {
			t.Fatalf("expected preview widget connection id local, got %#v", widget)
		}
	}
	if !found {
		t.Fatalf("expected to find created widget in workspace snapshot: %#v", response)
	}
}

func TestWorkspaceOpenPreviewInNewBlockRejectsDirectories(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	handler := NewHandler(&app.Runtime{
		RepoRoot:  repoRoot,
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
	}, testAuthToken)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/open-preview", map[string]any{
		"target_widget_id": "term-main",
		"path":             repoRoot,
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestWorkspaceCloseWidgetRemovesFilesWidget(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	openRecorder := httptest.NewRecorder()
	handler.ServeHTTP(openRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/open-directory", map[string]any{
		"target_widget_id": "term-main",
		"path":             "/workspace/repo/docs",
		"connection_id":    "local",
	}))
	if openRecorder.Code != http.StatusOK {
		t.Fatalf("expected open-directory 200, got %d (%s)", openRecorder.Code, openRecorder.Body.String())
	}

	var openResponse struct {
		WidgetID string `json:"widget_id"`
	}
	if err := json.Unmarshal(openRecorder.Body.Bytes(), &openResponse); err != nil {
		t.Fatalf("Unmarshal open response error: %v", err)
	}

	closeRecorder := httptest.NewRecorder()
	handler.ServeHTTP(closeRecorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/workspace/widgets/"+openResponse.WidgetID, nil))
	if closeRecorder.Code != http.StatusOK {
		t.Fatalf("expected close widget 200, got %d (%s)", closeRecorder.Code, closeRecorder.Body.String())
	}

	var closeResponse struct {
		ClosedWidgetID string `json:"closed_widget_id"`
		Workspace      struct {
			ActiveWidgetID string `json:"active_widget_id"`
			Widgets        []struct {
				ID string `json:"id"`
			} `json:"widgets"`
		} `json:"workspace"`
	}
	if err := json.Unmarshal(closeRecorder.Body.Bytes(), &closeResponse); err != nil {
		t.Fatalf("Unmarshal close response error: %v", err)
	}
	if closeResponse.ClosedWidgetID != openResponse.WidgetID {
		t.Fatalf("unexpected closed widget id: %#v", closeResponse)
	}
	if closeResponse.Workspace.ActiveWidgetID != "term-main" {
		t.Fatalf("expected active widget to fall back to term-main: %#v", closeResponse)
	}
	for _, widget := range closeResponse.Workspace.Widgets {
		if widget.ID == openResponse.WidgetID {
			t.Fatalf("closed widget still present: %#v", closeResponse.Workspace.Widgets)
		}
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

func TestWorkspaceMoveWidgetBySplitRequiresExplicitDirection(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/workspace/widgets/move-split", map[string]any{
		"tab_id":           "tab-main",
		"widget_id":        "term-main",
		"target_widget_id": "term-side",
		"direction":        "   ",
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
