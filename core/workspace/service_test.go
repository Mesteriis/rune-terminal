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
}
