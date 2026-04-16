package plugins

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

func TestResolvePluginCommandFailsForMissingPath(t *testing.T) {
	t.Parallel()

	_, err := resolvePluginCommand(filepath.Join(t.TempDir(), "missing-plugin-binary"))
	if !errors.Is(err, ErrProcessSpawnFailed) {
		t.Fatalf("expected ErrProcessSpawnFailed, got %v", err)
	}
}

func TestResolvePluginCommandResolvesPATHBinary(t *testing.T) {
	t.Parallel()

	resolved, err := resolvePluginCommand("sh")
	if err != nil {
		t.Fatalf("resolvePluginCommand error: %v", err)
	}
	if resolved == "" {
		t.Fatalf("expected resolved command path")
	}
}

func TestOSProcessSpawnerRejectsInvalidWorkingDirectory(t *testing.T) {
	t.Parallel()

	spawner := OSProcessSpawner{}
	_, err := spawner.Spawn(context.Background(), ProcessConfig{
		Command: "sh",
		Dir:     filepath.Join(t.TempDir(), "missing-dir"),
	})
	if !errors.Is(err, ErrProcessSpawnFailed) {
		t.Fatalf("expected ErrProcessSpawnFailed, got %v", err)
	}
}
