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
