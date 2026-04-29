package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/config"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func newWorkspaceCatalogRuntimeForPersistFailure(t *testing.T) *Runtime {
	t.Helper()

	snapshot := workspace.BootstrapDefault()
	return &Runtime{
		RepoRoot:         t.TempDir(),
		Paths:            config.Resolve(t.TempDir()),
		Workspace:        workspace.NewService(snapshot),
		WorkspaceCatalog: workspace.NewCatalogStore(workspace.BootstrapCatalog(snapshot)),
		Connections:      mustNewConnectionsService(t),
		Terminals:        terminal.NewService(interruptFakeLauncher{process: &interruptFakeProcess{outputCh: make(chan []byte, 1), waitCh: make(chan struct{})}}),
	}
}

func breakWorkspaceCatalogPersistencePath(t *testing.T, runtime *Runtime) {
	t.Helper()

	blockerPath := filepath.Join(t.TempDir(), "not-a-dir")
	if err := os.WriteFile(blockerPath, []byte("block"), 0o600); err != nil {
		t.Fatalf("write persistence blocker: %v", err)
	}
	runtime.Paths.WorkspaceCatalogFile = filepath.Join(blockerPath, "workspace-catalog.json")
}

func addWorkspaceCatalogSnapshot(t *testing.T, runtime *Runtime, snapshot workspace.Snapshot) {
	t.Helper()

	runtime.WorkspaceCatalog.Upsert(snapshot)
}

func TestSwitchWorkspaceDoesNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
	second := newWorkspaceSnapshot("ws-second", "tab-second", "term-second", "local")
	addWorkspaceCatalogSnapshot(t, runtime, second)
	beforeCatalog := runtime.WorkspaceCatalog.Snapshot()
	beforeWorkspace := runtime.Workspace.Snapshot()

	breakWorkspaceCatalogPersistencePath(t, runtime)
	if _, err := runtime.SwitchWorkspace(second.ID); err == nil {
		t.Fatalf("expected switch persist failure")
	}
	if after := runtime.WorkspaceCatalog.Snapshot(); after.ActiveWorkspaceID != beforeCatalog.ActiveWorkspaceID {
		t.Fatalf("expected failed switch to keep active catalog workspace %q, got %q", beforeCatalog.ActiveWorkspaceID, after.ActiveWorkspaceID)
	}
	if after := runtime.Workspace.Snapshot(); after.ID != beforeWorkspace.ID {
		t.Fatalf("expected failed switch to keep active workspace %q, got %q", beforeWorkspace.ID, after.ID)
	}
}

func TestCreateWorkspaceDoesNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
	beforeCatalog := runtime.WorkspaceCatalog.Snapshot()
	beforeWorkspace := runtime.Workspace.Snapshot()

	breakWorkspaceCatalogPersistencePath(t, runtime)
	if _, err := runtime.CreateWorkspace(context.Background()); err == nil {
		t.Fatalf("expected create persist failure")
	}
	afterCatalog := runtime.WorkspaceCatalog.Snapshot()
	if len(afterCatalog.Workspaces) != len(beforeCatalog.Workspaces) || afterCatalog.ActiveWorkspaceID != beforeCatalog.ActiveWorkspaceID {
		t.Fatalf("expected failed create to keep catalog unchanged, before=%#v after=%#v", beforeCatalog, afterCatalog)
	}
	if after := runtime.Workspace.Snapshot(); after.ID != beforeWorkspace.ID {
		t.Fatalf("expected failed create to keep active workspace %q, got %q", beforeWorkspace.ID, after.ID)
	}
}

func TestUpdateWorkspaceMetadataDoesNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
	beforeCatalog := runtime.WorkspaceCatalog.Snapshot()
	beforeWorkspace := runtime.Workspace.Snapshot()

	breakWorkspaceCatalogPersistencePath(t, runtime)
	if _, err := runtime.UpdateWorkspaceMetadata(beforeWorkspace.ID, "Changed", "*", "blue", false); err == nil {
		t.Fatalf("expected metadata persist failure")
	}
	afterCatalog := runtime.WorkspaceCatalog.Snapshot()
	if afterCatalog.Workspaces[0].Name != beforeCatalog.Workspaces[0].Name {
		t.Fatalf("expected failed metadata update to keep catalog name %q, got %q", beforeCatalog.Workspaces[0].Name, afterCatalog.Workspaces[0].Name)
	}
	if after := runtime.Workspace.Snapshot(); after.Name != beforeWorkspace.Name {
		t.Fatalf("expected failed metadata update to keep workspace name %q, got %q", beforeWorkspace.Name, after.Name)
	}
}

func TestDeleteWorkspaceDoesNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
	second := newWorkspaceSnapshot("ws-second", "tab-second", "term-second", "local")
	addWorkspaceCatalogSnapshot(t, runtime, second)
	beforeCatalog := runtime.WorkspaceCatalog.Snapshot()
	beforeWorkspace := runtime.Workspace.Snapshot()

	breakWorkspaceCatalogPersistencePath(t, runtime)
	if _, err := runtime.DeleteWorkspace(second.ID); err == nil {
		t.Fatalf("expected delete persist failure")
	}
	afterCatalog := runtime.WorkspaceCatalog.Snapshot()
	if len(afterCatalog.Workspaces) != len(beforeCatalog.Workspaces) {
		t.Fatalf("expected failed delete to keep workspace count %d, got %#v", len(beforeCatalog.Workspaces), afterCatalog.Workspaces)
	}
	if _, ok := runtime.WorkspaceCatalog.Get(second.ID); !ok {
		t.Fatalf("expected failed delete to keep workspace %q visible", second.ID)
	}
	if after := runtime.Workspace.Snapshot(); after.ID != beforeWorkspace.ID {
		t.Fatalf("expected failed delete to keep active workspace %q, got %q", beforeWorkspace.ID, after.ID)
	}
}
