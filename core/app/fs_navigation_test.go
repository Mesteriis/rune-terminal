package app

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestReadFSPreviewRejectsSymlinkOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	outsidePath := filepath.Join(outsideRoot, "secret.txt")
	if err := os.WriteFile(outsidePath, []byte("secret"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-secret.txt")
	if err := os.Symlink(outsidePath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.ReadFSPreview(linkPath, 8192)
	if !errors.Is(err, ErrFSPathOutsideWorkspace) {
		t.Fatalf("expected ErrFSPathOutsideWorkspace, got %v", err)
	}
}

func TestListFSRejectsSymlinkDirectoryOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	if err := os.WriteFile(filepath.Join(outsideRoot, "secret.txt"), []byte("secret"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-dir")
	if err := os.Symlink(outsideRoot, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.ListFS(linkPath, "")
	if !errors.Is(err, ErrFSPathOutsideWorkspace) {
		t.Fatalf("expected ErrFSPathOutsideWorkspace, got %v", err)
	}
}

func TestWriteFSFileRejectsSymlinkOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	outsidePath := filepath.Join(outsideRoot, "secret.txt")
	if err := os.WriteFile(outsidePath, []byte("before"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-secret.txt")
	if err := os.Symlink(outsidePath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.WriteFSFile(linkPath, "after")
	if !errors.Is(err, ErrFSPathOutsideWorkspace) {
		t.Fatalf("expected ErrFSPathOutsideWorkspace, got %v", err)
	}

	payload, err := os.ReadFile(outsidePath)
	if err != nil {
		t.Fatalf("read outside file: %v", err)
	}
	if string(payload) != "before" {
		t.Fatalf("outside file was modified: %q", string(payload))
	}
}

func TestMkdirFSRejectsSymlinkParentOutsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	outsideRoot := t.TempDir()
	linkPath := filepath.Join(repoRoot, "linked-dir")
	if err := os.Symlink(outsideRoot, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.MkdirFS(filepath.Join(linkPath, "created-outside"))
	if !errors.Is(err, ErrFSPathOutsideWorkspace) {
		t.Fatalf("expected ErrFSPathOutsideWorkspace, got %v", err)
	}
	if _, err := os.Stat(filepath.Join(outsideRoot, "created-outside")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("outside directory should not be created, stat err=%v", err)
	}
}
