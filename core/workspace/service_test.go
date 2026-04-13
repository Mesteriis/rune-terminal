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
