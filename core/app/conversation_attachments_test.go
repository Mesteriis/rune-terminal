package app

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

func TestCreateAttachmentReferenceAppendsAuditEventWithProvenance(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}
	filePath := filepath.Join(tempDir, "notes.txt")
	if err := os.WriteFile(filePath, []byte("notes"), 0o600); err != nil {
		t.Fatalf("write attachment file: %v", err)
	}

	runtime := &Runtime{Audit: auditLog}
	if _, err := runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path:         filePath,
		WorkspaceID:  "ws-default",
		ActionSource: "test.files.attach_to_ai",
	}); err != nil {
		t.Fatalf("create attachment reference: %v", err)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].ToolName != "agent.attachment_reference" || !events[0].Success {
		t.Fatalf("unexpected attachment audit event: %#v", events[0])
	}
	if events[0].WorkspaceID != "ws-default" || events[0].ActionSource != "test.files.attach_to_ai" {
		t.Fatalf("expected explicit provenance fields, got %#v", events[0])
	}
	if len(events[0].AffectedPaths) != 1 || events[0].AffectedPaths[0] != filePath {
		t.Fatalf("expected affected path audit field, got %#v", events[0])
	}
}
