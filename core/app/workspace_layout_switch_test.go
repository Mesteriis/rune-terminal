package app

import (
	"context"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestLayoutSwitchPreservesActiveSessionIdentity(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      301,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	runtime := newLaunchRuntime(t, process)

	created, err := runtime.CreateTerminalTab(context.Background(), "Layout Switch Shell")
	if err != nil {
		t.Fatalf("CreateTerminalTab error: %v", err)
	}
	beforeSnapshot := runtime.Workspace.Snapshot()
	beforeState, err := runtime.Terminals.GetState(created.WidgetID)
	if err != nil {
		t.Fatalf("GetState before switch error: %v", err)
	}

	_, err = runtime.UpdateLayout(workspace.Layout{
		ID:   "layout-focus-ai",
		Mode: workspace.LayoutModeFocus,
		Surfaces: []workspace.LayoutSurface{
			{ID: workspace.LayoutSurfaceTerminal, Region: workspace.LayoutRegionMain},
			{ID: workspace.LayoutSurfaceAI, Region: workspace.LayoutRegionSidebar},
		},
		ActiveSurfaceID: workspace.LayoutSurfaceAI,
	})
	if err != nil {
		t.Fatalf("UpdateLayout error: %v", err)
	}
	if _, err := runtime.SaveLayout("layout-focus-ai"); err != nil {
		t.Fatalf("SaveLayout error: %v", err)
	}
	if _, err := runtime.SwitchLayout("layout-default"); err != nil {
		t.Fatalf("SwitchLayout error: %v", err)
	}

	afterSnapshot := runtime.Workspace.Snapshot()
	afterState, err := runtime.Terminals.GetState(created.WidgetID)
	if err != nil {
		t.Fatalf("GetState after switch error: %v", err)
	}
	if afterSnapshot.ActiveTabID != beforeSnapshot.ActiveTabID {
		t.Fatalf("active tab changed across layout switch: before=%q after=%q", beforeSnapshot.ActiveTabID, afterSnapshot.ActiveTabID)
	}
	if afterSnapshot.ActiveWidgetID != beforeSnapshot.ActiveWidgetID {
		t.Fatalf("active widget changed across layout switch: before=%q after=%q", beforeSnapshot.ActiveWidgetID, afterSnapshot.ActiveWidgetID)
	}
	if afterState.SessionID != beforeState.SessionID {
		t.Fatalf("terminal session changed across layout switch: before=%q after=%q", beforeState.SessionID, afterState.SessionID)
	}
}
