package workspace

import "testing"

func TestFocusWidget(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	widget, err := service.FocusWidget("term-side")
	if err != nil {
		t.Fatalf("FocusWidget error: %v", err)
	}
	if widget.ID != "term-side" {
		t.Fatalf("unexpected widget: %#v", widget)
	}
	if service.Snapshot().ActiveWidgetID != "term-side" {
		t.Fatalf("active widget not updated")
	}
	if service.Snapshot().ActiveTabID != "tab-ops" {
		t.Fatalf("active tab not updated")
	}
}

func TestFocusTab(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	tab, err := service.FocusTab("tab-ops")
	if err != nil {
		t.Fatalf("FocusTab error: %v", err)
	}
	if tab.ID != "tab-ops" {
		t.Fatalf("unexpected tab: %#v", tab)
	}
	snapshot := service.Snapshot()
	if snapshot.ActiveTabID != "tab-ops" {
		t.Fatalf("active tab not updated")
	}
	if snapshot.ActiveWidgetID != "term-side" {
		t.Fatalf("active widget not synchronized with tab")
	}
}

func TestAddAndCloseTab(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	snapshot := service.AddTerminalTab(
		Tab{
			ID:          "tab-new",
			Title:       "New Shell",
			Description: "Terminal tab",
			WidgetIDs:   []string{"term-new"},
		},
		Widget{
			ID:          "term-new",
			Kind:        WidgetKindTerminal,
			Title:       "New Shell",
			Description: "New terminal session",
			TerminalID:  "term-new",
		},
	)
	if snapshot.ActiveTabID != "tab-new" || snapshot.ActiveWidgetID != "term-new" {
		t.Fatalf("new tab was not focused: %#v", snapshot)
	}

	next, err := service.CloseTab("tab-new")
	if err != nil {
		t.Fatalf("CloseTab error: %v", err)
	}
	if next.ActiveTabID != "tab-ops" {
		t.Fatalf("unexpected fallback tab: %#v", next)
	}
	for _, widget := range next.Widgets {
		if widget.ID == "term-new" {
			t.Fatalf("closed widget still present")
		}
	}
}

func TestRenameTab(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	tab, err := service.RenameTab("tab-main", "Project Shell")
	if err != nil {
		t.Fatalf("RenameTab error: %v", err)
	}
	if tab.Title != "Project Shell" {
		t.Fatalf("unexpected title: %#v", tab)
	}
	if service.Snapshot().Tabs[0].Title != "Project Shell" {
		t.Fatalf("snapshot title not updated")
	}
}

func TestRenameTabRejectsBlankTitles(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	if _, err := service.RenameTab("tab-main", "   "); err != ErrInvalidTabName {
		t.Fatalf("expected ErrInvalidTabName, got %v", err)
	}
}

func TestSetTabPinned(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	tab, err := service.SetTabPinned("tab-ops", true)
	if err != nil {
		t.Fatalf("SetTabPinned error: %v", err)
	}
	if !tab.Pinned {
		t.Fatalf("expected pinned tab: %#v", tab)
	}
	if !service.Snapshot().Tabs[1].Pinned {
		t.Fatalf("snapshot pinned state not updated")
	}
}

func TestMoveTab(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	service.SetTabPinned("tab-main", true)
	service.SetTabPinned("tab-ops", true)
	service.AddTerminalTab(
		Tab{
			ID:          "tab-third",
			Title:       "Third Shell",
			Description: "Terminal tab",
			WidgetIDs:   []string{"term-third"},
		},
		Widget{
			ID:          "term-third",
			Kind:        WidgetKindTerminal,
			Title:       "Third Shell",
			Description: "Third terminal session",
			TerminalID:  "term-third",
		},
	)

	snapshot, err := service.MoveTab("tab-ops", "tab-main")
	if err != nil {
		t.Fatalf("MoveTab error: %v", err)
	}
	if snapshot.Tabs[0].ID != "tab-ops" || snapshot.Tabs[1].ID != "tab-main" {
		t.Fatalf("unexpected tab order: %#v", snapshot.Tabs)
	}
}

func TestMoveTabRejectsCrossGroupMove(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	service.SetTabPinned("tab-main", true)
	if _, err := service.MoveTab("tab-main", "tab-ops"); err != ErrInvalidTabMove {
		t.Fatalf("expected ErrInvalidTabMove, got %v", err)
	}
}

func TestUpdateLayout(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	snapshot := service.UpdateLayout(Layout{
		ID:   "layout-focused",
		Mode: LayoutModeFocus,
		Surfaces: []LayoutSurface{
			{ID: LayoutSurfaceTerminal, Region: LayoutRegionMain},
			{ID: LayoutSurfaceAI, Region: LayoutRegionSidebar},
		},
		ActiveSurfaceID: LayoutSurfaceAI,
	})
	if snapshot.Layout.ID != "layout-focused" {
		t.Fatalf("unexpected layout id: %#v", snapshot.Layout)
	}
	if snapshot.Layout.Mode != LayoutModeFocus {
		t.Fatalf("unexpected layout mode: %#v", snapshot.Layout)
	}
	if snapshot.Layout.ActiveSurfaceID != LayoutSurfaceAI {
		t.Fatalf("unexpected active layout surface: %#v", snapshot.Layout)
	}
}

func TestUpdateLayoutKeepsTerminalSurface(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	snapshot := service.UpdateLayout(Layout{
		ID:   "layout-no-terminal",
		Mode: LayoutModeFocus,
		Surfaces: []LayoutSurface{
			{ID: LayoutSurfaceTools, Region: LayoutRegionUtility},
		},
		ActiveSurfaceID: LayoutSurfaceTools,
	})
	if len(snapshot.Layout.Surfaces) == 0 || snapshot.Layout.Surfaces[0].ID != LayoutSurfaceTerminal {
		t.Fatalf("expected terminal surface to be restored first, got %#v", snapshot.Layout.Surfaces)
	}
}

func TestSaveAndSwitchLayout(t *testing.T) {
	t.Parallel()

	service := NewService(BootstrapDefault())
	saved := service.SaveLayout("layout-ops")
	if saved.ActiveLayoutID != "layout-ops" {
		t.Fatalf("expected active layout to be layout-ops, got %q", saved.ActiveLayoutID)
	}
	if len(saved.Layouts) < 2 {
		t.Fatalf("expected saved layout to be appended, got %#v", saved.Layouts)
	}
	switched, err := service.SwitchLayout("layout-default")
	if err != nil {
		t.Fatalf("SwitchLayout error: %v", err)
	}
	if switched.ActiveLayoutID != "layout-default" {
		t.Fatalf("expected active layout id layout-default, got %q", switched.ActiveLayoutID)
	}
	if switched.Layout.ID != "layout-default" {
		t.Fatalf("expected active layout payload layout-default, got %#v", switched.Layout)
	}
}
