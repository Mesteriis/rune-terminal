package audit

import (
	"path/filepath"
	"testing"
)

func TestLogAppendAndList(t *testing.T) {
	t.Parallel()

	log, err := NewLog(filepath.Join(t.TempDir(), "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	if err := log.Append(Event{ToolName: "workspace.list_widgets", Success: true}); err != nil {
		t.Fatalf("Append error: %v", err)
	}
	if err := log.Append(Event{ToolName: "workspace.focus_widget", Success: false, Error: "approval_required"}); err != nil {
		t.Fatalf("Append error: %v", err)
	}

	events, err := log.List(10)
	if err != nil {
		t.Fatalf("List error: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0].ID == "" || events[1].Timestamp.IsZero() {
		t.Fatalf("expected populated audit metadata, got %#v", events)
	}
}
