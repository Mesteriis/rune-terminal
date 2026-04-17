package app

import (
	"context"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestCloseLastTabLeavesEmptyWorkspaceAndClosesSession(t *testing.T) {
	t.Parallel()

	process := &interruptFakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := terminal.NewService(interruptFakeLauncher{process: process})
	t.Cleanup(service.Close)

	snapshot := workspace.BootstrapDefault()
	snapshot.Tabs = snapshot.Tabs[:1]
	snapshot.Widgets = snapshot.Widgets[:1]
	snapshot.ActiveTabID = "tab-main"
	snapshot.ActiveWidgetID = "term-main"

	runtime := &Runtime{
		Workspace:   workspace.NewService(snapshot),
		Terminals:   service,
		Connections: mustNewConnectionsService(t),
	}

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		WorkingDir: t.TempDir(),
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local", Kind: "local"},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	result, err := runtime.CloseTab("tab-main")
	if err != nil {
		t.Fatalf("CloseTab error: %v", err)
	}
	if result.ClosedTabID != "tab-main" {
		t.Fatalf("unexpected closed tab id: %#v", result)
	}
	if len(result.Workspace.Tabs) != 0 {
		t.Fatalf("expected no tabs, got %#v", result.Workspace.Tabs)
	}
	if len(result.Workspace.Widgets) != 0 {
		t.Fatalf("expected no widgets, got %#v", result.Workspace.Widgets)
	}
	if result.Workspace.ActiveTabID != "" {
		t.Fatalf("expected empty active tab id, got %q", result.Workspace.ActiveTabID)
	}
	if result.Workspace.ActiveWidgetID != "" {
		t.Fatalf("expected empty active widget id, got %q", result.Workspace.ActiveWidgetID)
	}
	if _, err := runtime.Terminals.GetState("term-main"); err == nil {
		t.Fatalf("expected closed session to be removed")
	}
}
