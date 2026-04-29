package app

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReadFSFileRejectsOversizedTextContent(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "large.txt")
	if err := os.WriteFile(filePath, []byte(strings.Repeat("a", 1024*1024+1)), 0o600); err != nil {
		t.Fatalf("write large file: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.ReadFSFile(filePath)
	if !errors.Is(err, ErrFSPathTooLarge) {
		t.Fatalf("expected ErrFSPathTooLarge, got %v", err)
	}
}

func TestWriteFSFileRejectsOversizedContent(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "notes.txt")
	if err := os.WriteFile(filePath, []byte("before"), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.WriteFSFile(filePath, strings.Repeat("a", 1024*1024+1))
	if !errors.Is(err, ErrFSPathTooLarge) {
		t.Fatalf("expected ErrFSPathTooLarge, got %v", err)
	}

	payload, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("read file: %v", err)
	}
	if string(payload) != "before" {
		t.Fatalf("oversized write changed file content: %q", string(payload))
	}
}
