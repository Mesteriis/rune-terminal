package app

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/db"
	"github.com/Mesteriis/rune-terminal/core/policy"
)

func TestCreateAttachmentReferenceAppendsAuditEventWithProvenance(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	dbConn, err := db.Open(context.Background(), filepath.Join(tempDir, "runtime.db"))
	if err != nil {
		t.Fatalf("db open: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}
	filePath := filepath.Join(tempDir, "notes.txt")
	if err := os.WriteFile(filePath, []byte("notes"), 0o600); err != nil {
		t.Fatalf("write attachment file: %v", err)
	}

	runtime := &Runtime{Audit: auditLog, DB: dbConn}
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

	attachments, err := runtime.ListAttachmentReferences(context.Background(), 12)
	if err != nil {
		t.Fatalf("list attachment references: %v", err)
	}
	if len(attachments) != 1 {
		t.Fatalf("expected 1 stored attachment, got %#v", attachments)
	}
	if attachments[0].Path != filePath {
		t.Fatalf("expected stored attachment path %q, got %#v", filePath, attachments[0])
	}

	if err := runtime.DeleteAttachmentReference(context.Background(), attachments[0].ID); err != nil {
		t.Fatalf("delete attachment reference: %v", err)
	}
	attachments, err = runtime.ListAttachmentReferences(context.Background(), 12)
	if err != nil {
		t.Fatalf("list attachment references after delete: %v", err)
	}
	if len(attachments) != 0 {
		t.Fatalf("expected no stored attachments after delete, got %#v", attachments)
	}
}

func TestCreateAttachmentReferenceRejectsPathsOutsideAllowedRoots(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "outside.txt")
	if err := os.WriteFile(filePath, []byte("outside"), 0o600); err != nil {
		t.Fatalf("write attachment file: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), repoRoot)
	if err != nil {
		t.Fatalf("policy store: %v", err)
	}

	runtime := &Runtime{
		RepoRoot: repoRoot,
		Policy:   policyStore,
	}
	_, err = runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path:        filePath,
		WorkspaceID: "ws-default",
	})
	if !errors.Is(err, conversation.ErrAttachmentPolicyDenied) {
		t.Fatalf("expected ErrAttachmentPolicyDenied, got %v", err)
	}
}
