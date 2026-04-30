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

func TestWriteFSFilePreservesFileMode(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "notes.txt")
	if err := os.WriteFile(filePath, []byte("before"), 0o640); err != nil {
		t.Fatalf("write file: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.WriteFSFile(filePath, "after")
	if err != nil {
		t.Fatalf("WriteFSFile returned error: %v", err)
	}
	if result.Path != filePath || result.Content != "after" {
		t.Fatalf("unexpected write result: %#v", result)
	}

	info, err := os.Stat(filePath)
	if err != nil {
		t.Fatalf("stat file: %v", err)
	}
	if got := info.Mode().Perm(); got != 0o640 {
		t.Fatalf("expected file mode 0640, got %03o", got)
	}
}
