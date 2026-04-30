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
	runtime := &Runtime{
		RepoRoot:         t.TempDir(),
		Paths:            config.Resolve(t.TempDir()),
		Workspace:        workspace.NewService(snapshot),
		WorkspaceCatalog: workspace.NewCatalogStore(workspace.BootstrapCatalog(snapshot)),
		Connections:      mustNewConnectionsService(t),
		Terminals:        terminal.NewService(interruptFakeLauncher{process: &interruptFakeProcess{outputCh: make(chan []byte, 1), waitCh: make(chan struct{})}}),
	}
	t.Cleanup(runtime.Terminals.Close)
	return runtime
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

func TestWorkspaceControlActionsDoNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		mutate func(*Runtime) error
		assert func(*testing.T, workspace.Snapshot)
	}{
		{
			name: "focus widget",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.FocusWidget("term-side")
				return err
			},
			assert: func(t *testing.T, snapshot workspace.Snapshot) {
				t.Helper()
				if snapshot.ActiveWidgetID != "term-main" || snapshot.ActiveTabID != "tab-main" {
					t.Fatalf("expected failed focus to keep active term-main/tab-main, got %#v", snapshot)
				}
			},
		},
		{
			name: "rename tab",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.RenameTab("tab-main", "Changed")
				return err
			},
			assert: func(t *testing.T, snapshot workspace.Snapshot) {
				t.Helper()
				if snapshot.Tabs[0].Title != "Main Shell" {
					t.Fatalf("expected failed rename to keep title, got %#v", snapshot.Tabs[0])
				}
			},
		},
		{
			name: "pin tab",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.SetTabPinned("tab-main", true)
				return err
			},
			assert: func(t *testing.T, snapshot workspace.Snapshot) {
				t.Helper()
				if snapshot.Tabs[0].Pinned {
					t.Fatalf("expected failed pin to keep tab unpinned, got %#v", snapshot.Tabs[0])
				}
			},
		},
		{
			name: "update layout",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.UpdateLayout(workspace.Layout{
					ID:   "layout-focus-ai",
					Mode: workspace.LayoutModeFocus,
					Surfaces: []workspace.LayoutSurface{
						{ID: workspace.LayoutSurfaceTerminal, Region: workspace.LayoutRegionMain},
						{ID: workspace.LayoutSurfaceAI, Region: workspace.LayoutRegionSidebar},
					},
					ActiveSurfaceID: workspace.LayoutSurfaceAI,
				})
				return err
			},
			assert: func(t *testing.T, snapshot workspace.Snapshot) {
				t.Helper()
				if snapshot.Layout.ID != "layout-default" || snapshot.Layout.Mode != workspace.LayoutModeSplit {
					t.Fatalf("expected failed layout update to keep default layout, got %#v", snapshot.Layout)
				}
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
			breakWorkspaceCatalogPersistencePath(t, runtime)
			if err := tc.mutate(runtime); err == nil {
				t.Fatalf("expected %s persist failure", tc.name)
			}
			tc.assert(t, runtime.Workspace.Snapshot())
		})
	}
}

func TestWorkspaceAddWidgetActionsDoNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		mutate func(*Runtime) error
	}{
		{
			name: "create terminal tab",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.CreateTerminalTab(context.Background(), "Scratch")
				return err
			},
		},
		{
			name: "open directory block",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.OpenDirectoryInNewBlock(runtime.RepoRoot, "term-main", "local")
				return err
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
			before := runtime.Workspace.Snapshot()
			breakWorkspaceCatalogPersistencePath(t, runtime)
			if err := tc.mutate(runtime); err == nil {
				t.Fatalf("expected %s persist failure", tc.name)
			}
			after := runtime.Workspace.Snapshot()
			if len(after.Tabs) != len(before.Tabs) || len(after.Widgets) != len(before.Widgets) || after.ActiveWidgetID != before.ActiveWidgetID {
				t.Fatalf("expected failed %s to keep workspace unchanged, before=%#v after=%#v", tc.name, before, after)
			}
		})
	}
}

func TestWorkspaceCloseActionsDoNotChangeMemoryWhenPersistFails(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name   string
		mutate func(*Runtime) error
	}{
		{
			name: "close tab",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.CloseTab("tab-ops")
				return err
			},
		},
		{
			name: "close widget",
			mutate: func(runtime *Runtime) error {
				_, err := runtime.CloseWidget("term-side")
				return err
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
			before := runtime.Workspace.Snapshot()
			breakWorkspaceCatalogPersistencePath(t, runtime)
			if err := tc.mutate(runtime); err == nil {
				t.Fatalf("expected %s persist failure", tc.name)
			}
			after := runtime.Workspace.Snapshot()
			if len(after.Tabs) != len(before.Tabs) || len(after.Widgets) != len(before.Widgets) {
				t.Fatalf("expected failed %s to keep workspace unchanged, before=%#v after=%#v", tc.name, before, after)
			}
		})
	}
}

func TestCloseTabKeepsTerminalSessionWhenPersistFails(t *testing.T) {
	t.Parallel()

	runtime := newWorkspaceCatalogRuntimeForPersistFailure(t)
	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID: "term-side",
		Shell:    "/bin/sh",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	breakWorkspaceCatalogPersistencePath(t, runtime)
	if _, err := runtime.CloseTab("tab-ops"); err == nil {
		t.Fatalf("expected close tab persist failure")
	}
	if _, err := runtime.Terminals.GetState("term-side"); err != nil {
		t.Fatalf("expected failed close tab to keep terminal session, got %v", err)
	}
}
