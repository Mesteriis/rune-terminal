package app

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/terminal"
)

func TestCreateRemoteTerminalTabRejectsLocalConnectionTarget(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      101,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	runtime := newLaunchRuntime(t, process)

	_, err := runtime.CreateRemoteTerminalTab(context.Background(), "Remote Shell", "local")
	if !errors.Is(err, connections.ErrInvalidConnection) {
		t.Fatalf("expected invalid connection error, got %v", err)
	}
	if got := len(runtime.Workspace.Snapshot().Tabs); got != 2 {
		t.Fatalf("expected no new tab on local-target rejection, got %d tabs", got)
	}
}

func TestCreateRemoteTerminalTabCreatesSSHBoundWidget(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      102,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")
	runtime := newLaunchRuntime(t, process)

	connection, _, err := runtime.Connections.SaveSSH(connections.SaveSSHInput{
		Name: "Prod SSH",
		Host: "prod.example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save ssh connection: %v", err)
	}

	result, err := runtime.CreateRemoteTerminalTab(context.Background(), "Prod Shell", connection.ID)
	if err != nil {
		t.Fatalf("CreateRemoteTerminalTab error: %v", err)
	}
	if result.WidgetID == "" || result.TabID == "" {
		t.Fatalf("expected created tab/widget ids, got %#v", result)
	}

	snapshot := runtime.Workspace.Snapshot()
	if snapshot.ActiveWidgetID != result.WidgetID {
		t.Fatalf("expected active widget %q, got %q", result.WidgetID, snapshot.ActiveWidgetID)
	}

	var widgetConnectionID string
	for _, widget := range snapshot.Widgets {
		if widget.ID == result.WidgetID {
			widgetConnectionID = widget.ConnectionID
			break
		}
	}
	if widgetConnectionID != connection.ID {
		t.Fatalf("expected widget connection %q, got %q", connection.ID, widgetConnectionID)
	}

	state, err := runtime.Terminals.GetState(result.WidgetID)
	if err != nil {
		t.Fatalf("GetState error: %v", err)
	}
	if state.ConnectionKind != "ssh" {
		t.Fatalf("expected ssh connection kind, got %q", state.ConnectionKind)
	}
	if state.ConnectionID != connection.ID {
		t.Fatalf("expected ssh connection id %q, got %q", connection.ID, state.ConnectionID)
	}
}

func TestRemoteTerminalSessionPersistsAcrossTabSwitches(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      103,
		outputCh: make(chan []byte, 2),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")
	runtime := newLaunchRuntime(t, process)

	connection, _, err := runtime.Connections.SaveSSH(connections.SaveSSHInput{
		Name: "Switch Test SSH",
		Host: "switch.example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save ssh connection: %v", err)
	}

	result, err := runtime.CreateRemoteTerminalTab(context.Background(), "Remote Persist", connection.ID)
	if err != nil {
		t.Fatalf("CreateRemoteTerminalTab error: %v", err)
	}
	waitForTerminalChunks(t, runtime, result.WidgetID, 1)

	beforeSwitch, err := runtime.Terminals.Snapshot(result.WidgetID, 0)
	if err != nil {
		t.Fatalf("snapshot before switch: %v", err)
	}
	if len(beforeSwitch.Chunks) == 0 {
		t.Fatalf("expected remote chunks before switch")
	}

	if _, err := runtime.FocusTab("tab-main"); err != nil {
		t.Fatalf("focus local tab: %v", err)
	}
	if _, err := runtime.FocusTab(result.TabID); err != nil {
		t.Fatalf("focus remote tab: %v", err)
	}

	afterSwitch, err := runtime.Terminals.Snapshot(result.WidgetID, 0)
	if err != nil {
		t.Fatalf("snapshot after switch: %v", err)
	}
	if afterSwitch.State.ConnectionKind != "ssh" {
		t.Fatalf("expected ssh connection kind after switch, got %q", afterSwitch.State.ConnectionKind)
	}
	if len(afterSwitch.Chunks) < len(beforeSwitch.Chunks) {
		t.Fatalf("expected remote chunk persistence across tab switch, before=%d after=%d", len(beforeSwitch.Chunks), len(afterSwitch.Chunks))
	}
}

func TestCreateRemoteTerminalTabFromProfileCreatesSSHSession(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      104,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")
	runtime := newLaunchRuntime(t, process)

	profile, _, err := runtime.Connections.SaveRemoteProfile(connections.SaveRemoteProfileInput{
		Name: "Profile SSH",
		Host: "profile.example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save remote profile: %v", err)
	}

	result, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Profile Shell", profile.ID, "")
	if err != nil {
		t.Fatalf("CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if result.WidgetID == "" || result.TabID == "" {
		t.Fatalf("expected created tab/widget ids, got %#v", result)
	}
	if result.SessionID != result.WidgetID {
		t.Fatalf("expected session id %q to match widget id, got %q", result.WidgetID, result.SessionID)
	}
	if result.ProfileID != profile.ID {
		t.Fatalf("expected profile id %q, got %q", profile.ID, result.ProfileID)
	}
	if result.ConnectionID != profile.ID {
		t.Fatalf("expected connection id %q, got %q", profile.ID, result.ConnectionID)
	}
	if result.Reused {
		t.Fatalf("expected newly created profile session to not be marked reused")
	}
	state, err := runtime.Terminals.GetState(result.WidgetID)
	if err != nil {
		t.Fatalf("GetState error: %v", err)
	}
	if state.ConnectionKind != "ssh" {
		t.Fatalf("expected ssh connection kind, got %q", state.ConnectionKind)
	}
	if state.ConnectionID != profile.ID {
		t.Fatalf("expected profile-backed connection id %q, got %q", profile.ID, state.ConnectionID)
	}
}

func TestCreateRemoteTerminalTabFromProfileRequiresProfileID(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      105,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	runtime := newLaunchRuntime(t, process)

	if _, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Remote Shell", "", ""); !errors.Is(err, connections.ErrInvalidConnection) {
		t.Fatalf("expected invalid connection for empty profile id, got %v", err)
	}
}

func TestCreateRemoteTerminalTabFromProfileReusesRunningSession(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      106,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")
	runtime := newLaunchRuntime(t, process)

	profile, _, err := runtime.Connections.SaveRemoteProfile(connections.SaveRemoteProfileInput{
		Name: "Reuse SSH",
		Host: "reuse.example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save remote profile: %v", err)
	}

	first, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Reuse Shell", profile.ID, "")
	if err != nil {
		t.Fatalf("first CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if first.Reused {
		t.Fatalf("expected first profile open to create a new session")
	}

	second, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Reuse Shell", profile.ID, "")
	if err != nil {
		t.Fatalf("second CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if !second.Reused {
		t.Fatalf("expected second profile open to reuse running session")
	}
	if first.TabID != second.TabID || first.WidgetID != second.WidgetID || first.SessionID != second.SessionID {
		t.Fatalf("expected same session identity on reuse, first=%#v second=%#v", first, second)
	}

	snapshot := runtime.Workspace.Snapshot()
	if got := len(snapshot.Tabs); got != 3 {
		t.Fatalf("expected no duplicate tab creation during reuse, got %d tabs", got)
	}
}

func TestCreateRemoteTerminalTabFromProfileCarriesTmuxLaunchPolicy(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      107,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")
	var launched terminal.LaunchOptions
	runtime := newLaunchRuntimeWithCapture(t, process, &launched)

	profile, _, err := runtime.Connections.SaveRemoteProfile(connections.SaveRemoteProfileInput{
		Name:        "Prod Shell",
		Host:        "prod.example.com",
		User:        "deploy",
		LaunchMode:  connections.LaunchModeTmux,
		TmuxSession: "prod-main",
	})
	if err != nil {
		t.Fatalf("save remote profile: %v", err)
	}

	if _, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Prod Shell", profile.ID, ""); err != nil {
		t.Fatalf("CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if launched.Connection.SSH == nil {
		t.Fatalf("expected ssh launch config to be present")
	}
	if launched.Connection.SSH.LaunchMode != connections.LaunchModeTmux {
		t.Fatalf("expected tmux launch mode, got %#v", launched.Connection.SSH)
	}
	if launched.Connection.SSH.TmuxSession != "prod-main" {
		t.Fatalf("expected tmux session %q, got %#v", "prod-main", launched.Connection.SSH)
	}
}

func TestCreateRemoteTerminalTabFromProfileUsesTmuxSessionOverrideForReuse(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      108,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")
	var launched terminal.LaunchOptions
	runtime := newLaunchRuntimeWithCapture(t, process, &launched)

	profile, _, err := runtime.Connections.SaveRemoteProfile(connections.SaveRemoteProfileInput{
		Name:        "Prod Shell",
		Host:        "prod.example.com",
		User:        "deploy",
		LaunchMode:  connections.LaunchModeTmux,
		TmuxSession: "prod-main",
	})
	if err != nil {
		t.Fatalf("save remote profile: %v", err)
	}

	first, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Prod Shell", profile.ID, "prod-main")
	if err != nil {
		t.Fatalf("first CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if first.Reused {
		t.Fatalf("expected first tmux open to create a new session")
	}

	second, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Prod Shell", profile.ID, "prod-main")
	if err != nil {
		t.Fatalf("second CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if !second.Reused {
		t.Fatalf("expected same tmux session to reuse running remote widget")
	}

	third, err := runtime.CreateRemoteTerminalTabFromProfile(context.Background(), "Prod Shell", profile.ID, "prod-jobs")
	if err != nil {
		t.Fatalf("third CreateRemoteTerminalTabFromProfile error: %v", err)
	}
	if third.Reused {
		t.Fatalf("expected different tmux session override to create a new remote widget")
	}
	if launched.Connection.SSH == nil || launched.Connection.SSH.TmuxSession != "prod-jobs" {
		t.Fatalf("expected latest launch to use override tmux session, got %#v", launched.Connection.SSH)
	}
}

func waitForTerminalChunks(t *testing.T, runtime *Runtime, widgetID string, expected int) {
	t.Helper()
	deadline := time.Now().Add(300 * time.Millisecond)
	for {
		snapshot, err := runtime.Terminals.Snapshot(widgetID, 0)
		if err == nil && len(snapshot.Chunks) >= expected {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for terminal chunks on %s", widgetID)
		}
		time.Sleep(10 * time.Millisecond)
	}
}
