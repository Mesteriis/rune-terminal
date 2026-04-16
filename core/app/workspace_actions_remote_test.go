package app

import (
	"context"
	"errors"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
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
