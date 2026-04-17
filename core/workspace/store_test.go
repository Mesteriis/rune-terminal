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
