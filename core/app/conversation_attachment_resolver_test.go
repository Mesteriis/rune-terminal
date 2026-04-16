package app

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func TestResolveConversationAttachmentsReadsTextContent(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "readme.txt")
	if err := os.WriteFile(path, []byte("hello attachments"), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	resolved, err := resolveConversationAttachmentsWithLimits([]conversation.AttachmentReference{
		{ID: "att_1", Path: path, MimeType: "text/plain"},
	}, attachmentResolverLimits{
		MaxFileBytes: 1024,
		MaxReadBytes: 1024,
		MaxChars:     1024,
	})
	if err != nil {
		t.Fatalf("resolve attachments: %v", err)
	}
	if len(resolved) != 1 {
		t.Fatalf("expected one resolved attachment, got %d", len(resolved))
	}
	if !resolved[0].ContentRead {
		t.Fatalf("expected attachment content to be read: %#v", resolved[0])
	}
	if !strings.Contains(resolved[0].Content, "hello attachments") {
		t.Fatalf("unexpected content: %q", resolved[0].Content)
	}
	if resolved[0].Skipped {
		t.Fatalf("did not expect skip: %#v", resolved[0])
	}
}

func TestResolveConversationAttachmentsSkipsLargeFiles(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "large.txt")
	if err := os.WriteFile(path, []byte(strings.Repeat("x", 200)), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	resolved, err := resolveConversationAttachmentsWithLimits([]conversation.AttachmentReference{
		{ID: "att_large", Path: path, MimeType: "text/plain"},
	}, attachmentResolverLimits{
		MaxFileBytes: 64,
		MaxReadBytes: 64,
		MaxChars:     64,
	})
	if err != nil {
		t.Fatalf("resolve attachments: %v", err)
	}
	if len(resolved) != 1 {
		t.Fatalf("expected one resolved attachment, got %d", len(resolved))
	}
	if !resolved[0].Skipped || resolved[0].SkipReason != "file_too_large" {
		t.Fatalf("expected file_too_large skip, got %#v", resolved[0])
	}
}

func TestResolveConversationAttachmentsRejectsMissingFile(t *testing.T) {
	t.Parallel()

	_, err := resolveConversationAttachmentsWithLimits([]conversation.AttachmentReference{
		{ID: "att_missing", Path: filepath.Join(t.TempDir(), "missing.txt"), MimeType: "text/plain"},
	}, defaultAttachmentResolverLimits())
	if !errors.Is(err, conversation.ErrAttachmentNotFound) {
		t.Fatalf("expected ErrAttachmentNotFound, got %v", err)
	}
}

func TestResolveConversationAttachmentsSkipsUnsupportedType(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "image.bin")
	if err := os.WriteFile(path, []byte{0xff, 0xd8, 0xff, 0x00}, 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	resolved, err := resolveConversationAttachmentsWithLimits([]conversation.AttachmentReference{
		{ID: "att_bin", Path: path, MimeType: "application/octet-stream"},
	}, defaultAttachmentResolverLimits())
	if err != nil {
		t.Fatalf("resolve attachments: %v", err)
	}
	if len(resolved) != 1 {
		t.Fatalf("expected one resolved attachment, got %d", len(resolved))
	}
	if !resolved[0].Skipped || resolved[0].SkipReason != "unsupported_type" {
		t.Fatalf("expected unsupported_type skip, got %#v", resolved[0])
	}
}
