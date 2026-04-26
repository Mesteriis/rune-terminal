package app

import (
	"context"
	"errors"
	"path/filepath"
	"sync"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type queueLaunchOptions struct {
	mu        sync.Mutex
	processes []terminal.Process
	options   []terminal.LaunchOptions
}

func (l *queueLaunchOptions) Launch(_ context.Context, opts terminal.LaunchOptions) (terminal.Process, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.options = append(l.options, opts)
	if len(l.processes) == 0 {
		return nil, errors.New("no process configured")
	}
	process := l.processes[0]
	l.processes = l.processes[1:]
	return process, nil
}

func (l *queueLaunchOptions) launchedOptions() []terminal.LaunchOptions {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]terminal.LaunchOptions, len(l.options))
	copy(out, l.options)
	return out
}

func newRestartRuntime(t *testing.T, launcher terminal.Launcher) *Runtime {
	t.Helper()
	connectionStore, err := connections.NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), launchTestChecker{})
	if err != nil {
		t.Fatalf("new connections service: %v", err)
	}
	return &Runtime{
		RepoRoot:    t.TempDir(),
		Workspace:   workspace.NewService(workspace.BootstrapDefault()),
		Terminals:   terminal.NewService(launcher),
		Connections: connectionStore,
	}
}

func TestRestartTerminalSessionReplacesExistingProcess(t *testing.T) {
	t.Parallel()

	processA := &launchTestProcess{
		pid:      100,
		outputCh: make(chan []byte),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	processB := &launchTestProcess{
		pid:      200,
		outputCh: make(chan []byte),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	launcher := &queueLaunchOptions{
		processes: []terminal.Process{processA, processB},
	}
	runtime := newRestartRuntime(t, launcher)

	connection, err := runtime.connectionForWidget("local")
	if err != nil {
		t.Fatalf("connectionForWidget error: %v", err)
	}
	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		WorkingDir: runtime.RepoRoot,
		Connection: connection,
		Restored:   true,
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	state, err := runtime.RestartTerminalSession(context.Background(), "term-main")
	if err != nil {
		t.Fatalf("RestartTerminalSession error: %v", err)
	}
	if state.PID != 200 {
		t.Fatalf("expected replacement pid 200, got %d", state.PID)
	}
	if state.Restored {
		t.Fatalf("expected explicit restart session to be non-restored")
	}
	select {
	case <-processA.waitCh:
	default:
		t.Fatalf("expected original process to be closed")
	}
	options := launcher.launchedOptions()
	if len(options) != 2 {
		t.Fatalf("expected 2 launch calls, got %d", len(options))
	}
	if !options[0].Restored {
		t.Fatalf("expected first session to be marked restored")
	}
	if options[1].Restored {
		t.Fatalf("expected restarted session to be marked non-restored")
	}
}

func TestRestartTerminalSessionReturnsNotFoundForUnknownWidget(t *testing.T) {
	t.Parallel()

	runtime := newRestartRuntime(t, &queueLaunchOptions{})
	_, err := runtime.RestartTerminalSession(context.Background(), "missing-widget")
	if !errors.Is(err, terminal.ErrWidgetNotFound) {
		t.Fatalf("expected terminal.ErrWidgetNotFound, got %v", err)
	}
}

func TestCreateAndFocusTerminalSiblingSessionKeepsOneWidgetIdentity(t *testing.T) {
	t.Parallel()

	processA := &launchTestProcess{
		pid:      300,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	processB := &launchTestProcess{
		pid:      400,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	launcher := &queueLaunchOptions{
		processes: []terminal.Process{processA, processB},
	}
	runtime := newRestartRuntime(t, launcher)

	connection, err := runtime.connectionForWidget("local")
	if err != nil {
		t.Fatalf("connectionForWidget error: %v", err)
	}
	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		WorkingDir: runtime.RepoRoot,
		Connection: connection,
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	processA.outputCh <- []byte("session-a\n")

	snapshot, err := runtime.CreateTerminalSiblingSession(context.Background(), "term-main")
	if err != nil {
		t.Fatalf("CreateTerminalSiblingSession error: %v", err)
	}
	if snapshot.State.WidgetID != "term-main" {
		t.Fatalf("expected snapshot widget term-main, got %q", snapshot.State.WidgetID)
	}
	if snapshot.ActiveSessionID == "" || snapshot.ActiveSessionID == "term-main" {
		t.Fatalf("expected new active sibling session id, got %q", snapshot.ActiveSessionID)
	}
	if got := len(snapshot.Sessions); got != 2 {
		t.Fatalf("expected 2 grouped sessions, got %d", got)
	}

	focusedSnapshot, err := runtime.FocusTerminalSession("term-main", "term-main")
	if err != nil {
		t.Fatalf("FocusTerminalSession error: %v", err)
	}
	if focusedSnapshot.ActiveSessionID != "term-main" {
		t.Fatalf("expected active session term-main after focus, got %q", focusedSnapshot.ActiveSessionID)
	}
	if focusedSnapshot.State.SessionID != "term-main" {
		t.Fatalf("expected active state term-main after focus, got %q", focusedSnapshot.State.SessionID)
	}
}
