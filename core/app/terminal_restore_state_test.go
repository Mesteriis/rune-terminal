package app

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestTerminalSnapshotReturnsDisconnectedStateForKnownWidgetWithoutSession(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: terminal.NewService(&queueLaunchOptions{}),
		restored:  make(map[string]terminal.State),
	}

	snapshot, err := runtime.TerminalSnapshot("term-main", 0)
	if err != nil {
		t.Fatalf("TerminalSnapshot error: %v", err)
	}
	if snapshot.State.Status != terminal.StatusDisconnected {
		t.Fatalf("expected disconnected status, got %q", snapshot.State.Status)
	}
	if snapshot.State.ConnectionKind != "local" {
		t.Fatalf("expected local connection kind, got %q", snapshot.State.ConnectionKind)
	}
	if snapshot.State.CanSendInput {
		t.Fatalf("expected disconnected state to disable input")
	}
}

func TestTerminalSnapshotUnknownWidgetReturnsNotFound(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: terminal.NewService(&queueLaunchOptions{}),
		restored:  make(map[string]terminal.State),
	}

	_, err := runtime.TerminalSnapshot("missing-widget", 0)
	if !errors.Is(err, terminal.ErrWidgetNotFound) {
		t.Fatalf("expected terminal.ErrWidgetNotFound, got %v", err)
	}
}

func TestBootstrapSessionsKeepsRemoteWidgetAsDisconnectedWhenConnectionMissing(t *testing.T) {
	t.Parallel()

	localProcess := &launchTestProcess{
		pid:      101,
		outputCh: make(chan []byte),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	launcher := &queueLaunchOptions{
		processes: []terminal.Process{localProcess},
	}
	connectionStore, err := connections.NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), launchTestChecker{})
	if err != nil {
		t.Fatalf("new connections service: %v", err)
	}

	snapshot := workspace.BootstrapDefault()
	snapshot.Tabs = append(snapshot.Tabs, workspace.Tab{
		ID:          "tab-remote",
		Title:       "Remote Shell",
		Description: "Remote terminal tab",
		WidgetIDs:   []string{"term-remote"},
	})
	snapshot.Widgets = append(snapshot.Widgets, workspace.Widget{
		ID:           "term-remote",
		Kind:         workspace.WidgetKindTerminal,
		Title:        "Remote Shell",
		Description:  "Remote terminal session",
		TerminalID:   "term-remote",
		ConnectionID: "conn-missing",
	})

	runtime := &Runtime{
		RepoRoot:    t.TempDir(),
		Workspace:   workspace.NewService(snapshot),
		Terminals:   terminal.NewService(launcher),
		Connections: connectionStore,
		restored:    make(map[string]terminal.State),
	}

	if err := runtime.bootstrapSessions(context.Background()); err != nil {
		t.Fatalf("bootstrapSessions error: %v", err)
	}
	localState, err := runtime.Terminals.GetState("term-main")
	if err != nil {
		t.Fatalf("local state error: %v", err)
	}
	if localState.Status != terminal.StatusRunning {
		t.Fatalf("expected local running state, got %q", localState.Status)
	}
	if !localState.Restored {
		t.Fatalf("expected local session marked as restored")
	}

	remoteSnapshot, err := runtime.TerminalSnapshot("term-remote", 0)
	if err != nil {
		t.Fatalf("remote TerminalSnapshot error: %v", err)
	}
	if remoteSnapshot.State.Status != terminal.StatusDisconnected {
		t.Fatalf("expected remote disconnected status, got %q", remoteSnapshot.State.Status)
	}
	if remoteSnapshot.State.ConnectionKind != "ssh" {
		t.Fatalf("expected ssh connection kind, got %q", remoteSnapshot.State.ConnectionKind)
	}
	if !strings.Contains(remoteSnapshot.State.StatusDetail, "connection not found") {
		t.Fatalf("expected missing connection detail, got %q", remoteSnapshot.State.StatusDetail)
	}
}
