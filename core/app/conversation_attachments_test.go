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
	expectedFilePath, err := filepath.EvalSymlinks(filePath)
	if err != nil {
		t.Fatalf("eval attachment path: %v", err)
	}
	if len(events[0].AffectedPaths) != 1 || events[0].AffectedPaths[0] != expectedFilePath {
		t.Fatalf("expected affected path audit field, got %#v", events[0])
	}

	attachments, err := runtime.ListAttachmentReferences(context.Background(), 12)
	if err != nil {
		t.Fatalf("list attachment references: %v", err)
	}
	if len(attachments) != 1 {
		t.Fatalf("expected 1 stored attachment, got %#v", attachments)
	}
	if attachments[0].Path != expectedFilePath {
		t.Fatalf("expected stored attachment path %q, got %#v", expectedFilePath, attachments[0])
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

func TestCreateAttachmentReferenceDoesNotAuditSuccessWhenStoreFails(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	dbConn, err := db.Open(context.Background(), filepath.Join(tempDir, "runtime.db"))
	if err != nil {
		t.Fatalf("db open: %v", err)
	}
	if err := dbConn.Close(); err != nil {
		t.Fatalf("db close: %v", err)
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
	_, err = runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path:         filePath,
		WorkspaceID:  "ws-default",
		ActionSource: "test.files.attach_to_ai",
	})
	if err == nil {
		t.Fatalf("expected store failure")
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	for _, event := range events {
		if event.ToolName == "agent.attachment_reference" && event.Success {
			t.Fatalf("store failure must not append success audit event: %#v", event)
		}
	}
}

func TestCreateAttachmentReferenceDoesNotRequireAuditLog(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "notes.txt")
	if err := os.WriteFile(filePath, []byte("notes"), 0o600); err != nil {
		t.Fatalf("write attachment file: %v", err)
	}

	runtime := &Runtime{}
	reference, err := runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path: filePath,
	})
	if err != nil {
		t.Fatalf("create attachment reference: %v", err)
	}
	expectedFilePath, err := filepath.EvalSymlinks(filePath)
	if err != nil {
		t.Fatalf("eval attachment path: %v", err)
	}
	if reference.Path != expectedFilePath {
		t.Fatalf("expected attachment path %q, got %#v", expectedFilePath, reference)
	}
}

func TestDeleteAttachmentReferenceAppendsAuditEventWithProvenance(t *testing.T) {
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
	attachment, err := runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path:         filePath,
		WorkspaceID:  "ws-default",
		ActionSource: "test.files.attach_to_ai",
	})
	if err != nil {
		t.Fatalf("create attachment reference: %v", err)
	}
	if err := runtime.DeleteAttachmentReference(context.Background(), attachment.ID); err != nil {
		t.Fatalf("delete attachment reference: %v", err)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected create and delete audit events, got %#v", events)
	}
	deleteEvent := events[1]
	if deleteEvent.ToolName != "agent.attachment_reference.delete" || !deleteEvent.Success || deleteEvent.Error != "" {
		t.Fatalf("unexpected delete audit event: %#v", deleteEvent)
	}
	if deleteEvent.WorkspaceID != "ws-default" || deleteEvent.ActionSource != "test.files.attach_to_ai" {
		t.Fatalf("expected stored provenance on delete audit event, got %#v", deleteEvent)
	}
	if len(deleteEvent.AffectedPaths) != 1 || deleteEvent.AffectedPaths[0] != events[0].AffectedPaths[0] {
		t.Fatalf("expected deleted attachment path in audit event, got %#v", deleteEvent)
	}
}

func TestDeleteAttachmentReferenceAppendsFailureAuditEvent(t *testing.T) {
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

	runtime := &Runtime{Audit: auditLog, DB: dbConn}
	err = runtime.DeleteAttachmentReference(context.Background(), "missing")
	if !errors.Is(err, conversation.ErrAttachmentNotFound) {
		t.Fatalf("expected ErrAttachmentNotFound, got %v", err)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected one failure audit event, got %#v", events)
	}
	if events[0].ToolName != "agent.attachment_reference.delete" || events[0].Success || events[0].Error == "" {
		t.Fatalf("unexpected delete failure audit event: %#v", events[0])
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
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}

	runtime := &Runtime{
		RepoRoot: repoRoot,
		Policy:   policyStore,
		Audit:    auditLog,
	}
	_, err = runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path:         filePath,
		WorkspaceID:  "ws-default",
		ActionSource: "test.files.attach_to_ai",
	})
	if !errors.Is(err, conversation.ErrAttachmentPolicyDenied) {
		t.Fatalf("expected ErrAttachmentPolicyDenied, got %v", err)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected one denial audit event, got %#v", events)
	}
	if events[0].ToolName != "agent.attachment_reference" || events[0].Success {
		t.Fatalf("unexpected denial audit event: %#v", events[0])
	}
	if events[0].WorkspaceID != "ws-default" || events[0].ActionSource != "test.files.attach_to_ai" {
		t.Fatalf("expected provenance on denial audit event, got %#v", events[0])
	}
	expectedDeniedPath, err := filepath.EvalSymlinks(filePath)
	if err != nil {
		t.Fatalf("eval denied path: %v", err)
	}
	if len(events[0].AffectedPaths) != 1 || events[0].AffectedPaths[0] != expectedDeniedPath {
		t.Fatalf("expected denied path in audit event, got %#v", events[0].AffectedPaths)
	}
}

func TestCreateAttachmentReferenceRejectsSymlinkOutsideAllowedRoots(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	tempDir := t.TempDir()
	outsidePath := filepath.Join(tempDir, "outside.txt")
	if err := os.WriteFile(outsidePath, []byte("outside"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-outside.txt")
	if err := os.Symlink(outsidePath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), repoRoot)
	if err != nil {
		t.Fatalf("policy store: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}

	runtime := &Runtime{
		RepoRoot: repoRoot,
		Policy:   policyStore,
		Audit:    auditLog,
	}
	_, err = runtime.CreateAttachmentReference(CreateAttachmentReferenceRequest{
		Path:        linkPath,
		WorkspaceID: "ws-default",
	})
	if !errors.Is(err, conversation.ErrAttachmentPolicyDenied) {
		t.Fatalf("expected ErrAttachmentPolicyDenied, got %v", err)
	}
}
