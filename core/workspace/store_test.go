package workspace

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestLoadSnapshotReturnsFallbackWhenFileMissing(t *testing.T) {
	t.Parallel()

	fallback := BootstrapDefault()
	snapshot, err := LoadSnapshot(filepath.Join(t.TempDir(), "workspace.json"), fallback)
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if !reflect.DeepEqual(snapshot, fallback) {
		t.Fatalf("expected fallback snapshot, got %#v", snapshot)
	}
}

func TestSaveAndLoadSnapshotRoundTrip(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "workspace.json")
	snapshot := BootstrapDefault()
	snapshot.Name = "My Workspace"
	snapshot.Tabs[0].Title = "Project Shell"

	if err := SaveSnapshot(path, snapshot); err != nil {
		t.Fatalf("SaveSnapshot error: %v", err)
	}
	loaded, err := LoadSnapshot(path, BootstrapDefault())
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if !reflect.DeepEqual(loaded, snapshot) {
		t.Fatalf("expected round-trip snapshot, got %#v", loaded)
	}
}

func TestSaveAndLoadCatalogRoundTrip(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "state", "workspace-catalog.json")
	catalog := BootstrapCatalog(BootstrapDefault())
	next := BootstrapDefault()
	next.ID = "ws-secondary"
	next.Name = "Secondary"
	catalog.Workspaces = append(catalog.Workspaces, next)
	catalog.ActiveWorkspaceID = next.ID

	if err := SaveCatalog(path, catalog); err != nil {
		t.Fatalf("SaveCatalog error: %v", err)
	}
	loaded, err := LoadCatalog(path, BootstrapDefault())
	if err != nil {
		t.Fatalf("LoadCatalog error: %v", err)
	}
	if !reflect.DeepEqual(loaded, catalog) {
		t.Fatalf("expected round-trip catalog, got %#v", loaded)
	}
}

func TestSaveAndLoadSnapshotPreservesEmptyWorkspace(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "workspace.json")
	snapshot := BootstrapDefault()
	snapshot.Tabs = nil
	snapshot.Widgets = nil
	snapshot.ActiveTabID = ""
	snapshot.ActiveWidgetID = ""

	if err := SaveSnapshot(path, snapshot); err != nil {
		t.Fatalf("SaveSnapshot error: %v", err)
	}
	loaded, err := LoadSnapshot(path, BootstrapDefault())
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if len(loaded.Tabs) != 0 {
		t.Fatalf("expected zero tabs, got %#v", loaded.Tabs)
	}
	if len(loaded.Widgets) != 0 {
		t.Fatalf("expected zero widgets, got %#v", loaded.Widgets)
	}
	if loaded.ActiveTabID != "" {
		t.Fatalf("expected empty active tab id, got %q", loaded.ActiveTabID)
	}
	if loaded.ActiveWidgetID != "" {
		t.Fatalf("expected empty active widget id, got %q", loaded.ActiveWidgetID)
	}
	if loaded.ID != snapshot.ID || loaded.Name != snapshot.Name {
		t.Fatalf("expected workspace identity preserved, got %#v", loaded)
	}
}

func TestLoadSnapshotNormalizesInvalidSnapshot(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "workspace.json")
	fallback := BootstrapDefault()
	if err := SaveSnapshot(path, Snapshot{
		ID:             "ws-local",
		Name:           "Local Workspace",
		ActiveTabID:    "missing-tab",
		ActiveWidgetID: "missing-widget",
		Tabs: []Tab{
			{
				ID:        "tab-main",
				Title:     "Main Shell",
				WidgetIDs: []string{"term-main"},
			},
		},
		Widgets: []Widget{
			{
				ID:         "term-main",
				Kind:       WidgetKindTerminal,
				Title:      "Main Shell",
				TerminalID: "term-main",
			},
			{
				ID:         "orphan",
				Kind:       WidgetKindTerminal,
				Title:      "Orphan",
				TerminalID: "orphan",
			},
		},
	}); err != nil {
		t.Fatalf("SaveSnapshot error: %v", err)
	}

	loaded, err := LoadSnapshot(path, fallback)
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if loaded.ActiveTabID != "tab-main" {
		t.Fatalf("expected normalized active tab id, got %q", loaded.ActiveTabID)
	}
	if loaded.ActiveWidgetID != "term-main" {
		t.Fatalf("expected normalized active widget id, got %q", loaded.ActiveWidgetID)
	}
	if len(loaded.Widgets) != 1 || loaded.Widgets[0].ID != "term-main" {
		t.Fatalf("expected orphan widget removed, got %#v", loaded.Widgets)
	}
}

func TestSaveAndLoadSnapshotPersistsLayout(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "workspace.json")
	snapshot := BootstrapDefault()
	snapshot.Layout = Layout{
		ID:   "layout-ops",
		Mode: LayoutModeFocus,
		Surfaces: []LayoutSurface{
			{ID: LayoutSurfaceTerminal, Region: LayoutRegionMain},
			{ID: LayoutSurfaceTools, Region: LayoutRegionUtility},
		},
		ActiveSurfaceID: LayoutSurfaceTools,
	}
	snapshot.Layouts = []Layout{cloneLayout(snapshot.Layout)}
	snapshot.ActiveLayoutID = snapshot.Layout.ID

	if err := SaveSnapshot(path, snapshot); err != nil {
		t.Fatalf("SaveSnapshot error: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile error: %v", err)
	}
	if !strings.Contains(string(data), "\"layout\"") {
		t.Fatalf("expected persisted payload to include layout, got %s", string(data))
	}

	loaded, err := LoadSnapshot(path, BootstrapDefault())
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if !reflect.DeepEqual(loaded.Layout, snapshot.Layout) {
		left, _ := json.Marshal(loaded.Layout)
		right, _ := json.Marshal(snapshot.Layout)
		t.Fatalf("expected layout roundtrip match: got=%s want=%s", left, right)
	}
}

func TestSaveAndLoadSnapshotPersistsWindowLayoutAndActiveWidget(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "workspace.json")
	snapshot := BootstrapDefault()
	snapshot.Tabs[0].WidgetIDs = []string{"term-main", "term-split"}
	snapshot.Tabs[0].WindowLayout = &WindowLayoutNode{
		Kind: WindowNodeSplit,
		Axis: WindowSplitHorizontal,
		First: &WindowLayoutNode{
			Kind:     WindowNodeLeaf,
			WidgetID: "term-main",
		},
		Second: &WindowLayoutNode{
			Kind:     WindowNodeLeaf,
			WidgetID: "term-split",
		},
	}
	snapshot.Widgets = append(snapshot.Widgets, Widget{
		ID:          "term-split",
		Kind:        WidgetKindTerminal,
		Title:       "Split",
		Description: "Split session",
		TerminalID:  "term-split",
	})
	snapshot.ActiveTabID = "tab-main"
	snapshot.ActiveWidgetID = "term-split"

	if err := SaveSnapshot(path, snapshot); err != nil {
		t.Fatalf("SaveSnapshot error: %v", err)
	}
	loaded, err := LoadSnapshot(path, BootstrapDefault())
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if loaded.ActiveWidgetID != "term-split" {
		t.Fatalf("expected active widget to persist, got %q", loaded.ActiveWidgetID)
	}
	var tabMain Tab
	for _, tab := range loaded.Tabs {
		if tab.ID == "tab-main" {
			tabMain = tab
			break
		}
	}
	if tabMain.WindowLayout == nil || tabMain.WindowLayout.Kind != WindowNodeSplit || tabMain.WindowLayout.Axis != WindowSplitHorizontal {
		t.Fatalf("expected persisted split window layout, got %#v", tabMain.WindowLayout)
	}
}

func TestLoadSnapshotNormalizesWindowLayoutAgainstValidWidgets(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "workspace.json")
	fallback := BootstrapDefault()
	if err := SaveSnapshot(path, Snapshot{
		ID:             "ws-local",
		Name:           "Local Workspace",
		ActiveTabID:    "tab-main",
		ActiveWidgetID: "ghost-widget",
		Tabs: []Tab{
			{
				ID:        "tab-main",
				Title:     "Main Shell",
				WidgetIDs: []string{"term-main", "term-main", "term-split", "term-missing"},
				WindowLayout: &WindowLayoutNode{
					Kind: WindowNodeSplit,
					Axis: WindowSplitHorizontal,
					First: &WindowLayoutNode{
						Kind:     WindowNodeLeaf,
						WidgetID: "ghost-widget",
					},
					Second: &WindowLayoutNode{
						Kind:     WindowNodeLeaf,
						WidgetID: "term-main",
					},
				},
			},
		},
		Widgets: []Widget{
			{
				ID:         "term-main",
				Kind:       WidgetKindTerminal,
				Title:      "Main Shell",
				TerminalID: "term-main",
			},
			{
				ID:         "term-split",
				Kind:       WidgetKindTerminal,
				Title:      "Split Shell",
				TerminalID: "term-split",
			},
			{
				ID:         "term-main",
				Kind:       WidgetKindTerminal,
				Title:      "Duplicate Main",
				TerminalID: "term-main",
			},
		},
	}); err != nil {
		t.Fatalf("SaveSnapshot error: %v", err)
	}

	loaded, err := LoadSnapshot(path, fallback)
	if err != nil {
		t.Fatalf("LoadSnapshot error: %v", err)
	}
	if loaded.ActiveWidgetID != "term-main" {
		t.Fatalf("expected active widget to normalize to first valid window leaf, got %q", loaded.ActiveWidgetID)
	}
	if len(loaded.Tabs) != 1 {
		t.Fatalf("expected one normalized tab, got %#v", loaded.Tabs)
	}
	if !reflect.DeepEqual(loaded.Tabs[0].WidgetIDs, []string{"term-main", "term-split"}) {
		t.Fatalf("expected deduplicated and filtered widget ids, got %#v", loaded.Tabs[0].WidgetIDs)
	}
	if len(loaded.Widgets) != 2 {
		t.Fatalf("expected deduplicated referenced widgets, got %#v", loaded.Widgets)
	}
	if loaded.Tabs[0].WindowLayout == nil || loaded.Tabs[0].WindowLayout.Kind != WindowNodeSplit {
		t.Fatalf("expected normalized split window layout, got %#v", loaded.Tabs[0].WindowLayout)
	}
}
