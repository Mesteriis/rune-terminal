package app

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDeleteFSRemovesSymlinkEntryWithoutDeletingTarget(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "target.txt")
	if err := os.WriteFile(targetPath, []byte("keep me"), 0o600); err != nil {
		t.Fatalf("write target file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-target.txt")
	if err := os.Symlink(targetPath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.DeleteFS([]string{linkPath})
	if err != nil {
		t.Fatalf("DeleteFS returned error: %v", err)
	}
	if len(result.Paths) != 1 || result.Paths[0] != linkPath {
		t.Fatalf("expected deleted symlink path %q, got %#v", linkPath, result.Paths)
	}
	if _, err := os.Lstat(linkPath); !os.IsNotExist(err) {
		t.Fatalf("expected symlink entry to be removed, stat err=%v", err)
	}
	payload, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("target file should remain readable: %v", err)
	}
	if string(payload) != "keep me" {
		t.Fatalf("target file content changed: %q", string(payload))
	}
}

func TestRenameFSRenamesSymlinkEntryWithoutRenamingTarget(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "target.txt")
	if err := os.WriteFile(targetPath, []byte("keep me"), 0o600); err != nil {
		t.Fatalf("write target file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-target.txt")
	if err := os.Symlink(targetPath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}
	renamedPath := filepath.Join(repoRoot, "renamed-link.txt")

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.RenameFS([]FSRenameEntry{{Path: linkPath, NextName: "renamed-link.txt"}}, false)
	if err != nil {
		t.Fatalf("RenameFS returned error: %v", err)
	}
	if len(result.Paths) != 1 || result.Paths[0] != renamedPath {
		t.Fatalf("expected renamed symlink path %q, got %#v", renamedPath, result.Paths)
	}
	if _, err := os.Lstat(linkPath); !os.IsNotExist(err) {
		t.Fatalf("expected old symlink entry to be removed, stat err=%v", err)
	}
	info, err := os.Lstat(renamedPath)
	if err != nil {
		t.Fatalf("expected renamed symlink entry: %v", err)
	}
	if info.Mode()&os.ModeSymlink == 0 {
		t.Fatalf("expected renamed entry to remain a symlink, mode=%s", info.Mode())
	}
	linkTarget, err := os.Readlink(renamedPath)
	if err != nil {
		t.Fatalf("read renamed symlink: %v", err)
	}
	if linkTarget != targetPath {
		t.Fatalf("expected renamed symlink target %q, got %q", targetPath, linkTarget)
	}
	if _, err := os.Stat(targetPath); err != nil {
		t.Fatalf("target file should remain in place: %v", err)
	}
}

func TestMoveFSMovesSymlinkEntryWithoutMovingTarget(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "target.txt")
	if err := os.WriteFile(targetPath, []byte("keep me"), 0o600); err != nil {
		t.Fatalf("write target file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-target.txt")
	if err := os.Symlink(targetPath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}
	destinationDir := filepath.Join(repoRoot, "dest")
	if err := os.Mkdir(destinationDir, 0o755); err != nil {
		t.Fatalf("create destination dir: %v", err)
	}
	movedPath := filepath.Join(destinationDir, filepath.Base(linkPath))

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.MoveFS([]string{linkPath}, destinationDir, false)
	if err != nil {
		t.Fatalf("MoveFS returned error: %v", err)
	}
	if len(result.Paths) != 1 || result.Paths[0] != movedPath {
		t.Fatalf("expected moved symlink path %q, got %#v", movedPath, result.Paths)
	}
	if _, err := os.Lstat(linkPath); !os.IsNotExist(err) {
		t.Fatalf("expected old symlink entry to be removed, stat err=%v", err)
	}
	info, err := os.Lstat(movedPath)
	if err != nil {
		t.Fatalf("expected moved symlink entry: %v", err)
	}
	if info.Mode()&os.ModeSymlink == 0 {
		t.Fatalf("expected moved entry to remain a symlink, mode=%s", info.Mode())
	}
	if _, err := os.Stat(targetPath); err != nil {
		t.Fatalf("target file should remain in place: %v", err)
	}
}

func TestCopyFSCopiesSymlinkEntryWithoutCopyingTargetContent(t *testing.T) {
	t.Parallel()

	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "target.txt")
	if err := os.WriteFile(targetPath, []byte("keep me"), 0o600); err != nil {
		t.Fatalf("write target file: %v", err)
	}
	linkPath := filepath.Join(repoRoot, "linked-target.txt")
	if err := os.Symlink(targetPath, linkPath); err != nil {
		t.Fatalf("create symlink: %v", err)
	}
	destinationDir := filepath.Join(repoRoot, "dest")
	if err := os.Mkdir(destinationDir, 0o755); err != nil {
		t.Fatalf("create destination dir: %v", err)
	}
	copiedPath := filepath.Join(destinationDir, filepath.Base(linkPath))

	runtime := &Runtime{RepoRoot: repoRoot}
	result, err := runtime.CopyFS([]string{linkPath}, destinationDir, false)
	if err != nil {
		t.Fatalf("CopyFS returned error: %v", err)
	}
	if len(result.Paths) != 1 || result.Paths[0] != copiedPath {
		t.Fatalf("expected copied symlink path %q, got %#v", copiedPath, result.Paths)
	}
	info, err := os.Lstat(copiedPath)
	if err != nil {
		t.Fatalf("expected copied symlink entry: %v", err)
	}
	if info.Mode()&os.ModeSymlink == 0 {
		t.Fatalf("expected copied entry to remain a symlink, mode=%s", info.Mode())
	}
	linkTarget, err := os.Readlink(copiedPath)
	if err != nil {
		t.Fatalf("read copied symlink: %v", err)
	}
	if linkTarget != targetPath {
		t.Fatalf("expected copied symlink target %q, got %q", targetPath, linkTarget)
	}
}
