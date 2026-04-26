package plugins

import (
	"context"
	"errors"
	"io"
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

func TestOSProcessSpawnerDoesNotInheritParentEnvironment(t *testing.T) {
	t.Setenv("RTERM_PLUGIN_PARENT_SECRET", "parent-secret")

	spawner := OSProcessSpawner{}
	process, err := spawner.Spawn(context.Background(), ProcessConfig{
		Command: "sh",
		Args: []string{
			"-c",
			`printf "%s|%s" "$RTERM_PLUGIN_PARENT_SECRET" "$RTERM_PLUGIN_ALLOWED"`,
		},
		Env: []string{"RTERM_PLUGIN_ALLOWED=allowed"},
	})
	if err != nil {
		t.Fatalf("Spawn error: %v", err)
	}
	_ = process.Stdin().Close()

	output, err := io.ReadAll(process.Stdout())
	if err != nil {
		t.Fatalf("read stdout: %v", err)
	}
	if err := process.Wait(); err != nil {
		t.Fatalf("Wait error: %v", err)
	}
	if string(output) != "|allowed" {
		t.Fatalf("expected explicit env only, got %q", string(output))
	}
}
