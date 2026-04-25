package app

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestOpenFSExternalUsesResolvedWorkspacePath(t *testing.T) {
	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "binary.dat")
	if err := os.WriteFile(targetPath, []byte{0x00, 0x01, 0x02}, 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	var openedPath string
	previousOpenFSExternal := openFSExternal
	openFSExternal = func(path string) error {
		openedPath = path
		return nil
	}
	defer func() {
		openFSExternal = previousOpenFSExternal
	}()

	result, err := runtime.OpenFSExternal("./binary.dat")
	if err != nil {
		t.Fatalf("OpenFSExternal returned error: %v", err)
	}
	if result.Path != targetPath {
		t.Fatalf("unexpected result path %q", result.Path)
	}
	if openedPath != targetPath {
		t.Fatalf("unexpected opened path %q", openedPath)
	}
}

func TestOpenFSExternalReturnsUnavailableError(t *testing.T) {
	repoRoot := t.TempDir()
	targetPath := filepath.Join(repoRoot, "binary.dat")
	if err := os.WriteFile(targetPath, []byte{0x00, 0x01, 0x02}, 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	runtime := &Runtime{RepoRoot: repoRoot}
	previousOpenFSExternal := openFSExternal
	openFSExternal = func(path string) error {
		return ErrFSExternalOpenUnavailable
	}
	defer func() {
		openFSExternal = previousOpenFSExternal
	}()

	_, err := runtime.OpenFSExternal(targetPath)
	if !errors.Is(err, ErrFSExternalOpenUnavailable) {
		t.Fatalf("expected unavailable error, got %v", err)
	}
}
