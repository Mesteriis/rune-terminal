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

func TestReadFSPreviewReturnsCanonicalPathForSymlinkInsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "target.txt")
	if err := os.WriteFile(targetPath, []byte("inside"), 0o600); err != nil {
		t.Fatalf("write target file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-target.txt")
	if err := os.Symlink(targetPath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.ReadFSPreview(linkPath, 8192)
	if err != nil {
		t.Fatalf("ReadFSPreview returned error: %v", err)
	}
	expectedPath, err := filepath.EvalSymlinks(targetPath)
	if err != nil {
		t.Fatalf("eval target path: %v", err)
	}
	if result.Path != expectedPath {
		t.Fatalf("expected canonical result path %q, got %q", expectedPath, result.Path)
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

func TestListFSRejectsFilePathAsDirectory(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	filePath := filepath.Join(repoRoot, "README.md")
	if err := os.WriteFile(filePath, []byte("not a directory"), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	_, err := runtime.ListFS(filePath, "")
	if !errors.Is(err, ErrFSPathNotDirectory) {
		t.Fatalf("expected ErrFSPathNotDirectory, got %v", err)
	}
}

func TestMkdirFSReturnsCanonicalPathForSymlinkParentInsideWorkspace(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetDir := filepath.Join(repoRoot, "target-dir")
	if err := os.Mkdir(targetDir, 0o755); err != nil {
		t.Fatalf("create target dir: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-dir-inside")
	if err := os.Symlink(targetDir, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.MkdirFS(filepath.Join(linkPath, "created-inside"))
	if err != nil {
		t.Fatalf("MkdirFS returned error: %v", err)
	}
	expectedDir, err := filepath.EvalSymlinks(targetDir)
	if err != nil {
		t.Fatalf("eval target dir: %v", err)
	}
	expectedPath := filepath.Join(expectedDir, "created-inside")
	if result.Path != expectedPath {
		t.Fatalf("expected canonical result path %q, got %q", expectedPath, result.Path)
	}
	if _, err := os.Stat(expectedPath); err != nil {
		t.Fatalf("expected directory at canonical target: %v", err)
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
