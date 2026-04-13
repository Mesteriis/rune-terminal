package app

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/avm/rterm/core/connections"
	"github.com/avm/rterm/core/terminal"
	"github.com/avm/rterm/core/toolruntime"
	"github.com/avm/rterm/core/workspace"
)

func TestWorkspaceFocusTabToolSynchronizesActiveWidget(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
	}

	tool := runtime.workspaceFocusTabTool()

	plan, err := tool.Plan(focusTabInput{TabID: "tab-ops"}, toolruntime.ExecutionContext{})
	if err != nil {
		t.Fatalf("Plan error: %v", err)
	}
	if plan.Operation.Summary != "focus tab tab-ops" {
		t.Fatalf("unexpected summary: %q", plan.Operation.Summary)
	}

	output, err := tool.Execute(context.Background(), toolruntime.ExecutionContext{}, focusTabInput{TabID: "tab-ops"})
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	tab, ok := output.(workspace.Tab)
	if !ok {
		t.Fatalf("unexpected output type: %#v", output)
	}
	if tab.ID != "tab-ops" {
		t.Fatalf("unexpected tab: %#v", tab)
	}

	snapshot := runtime.Workspace.Snapshot()
	if snapshot.ActiveTabID != "tab-ops" {
		t.Fatalf("active tab not updated")
	}
	if snapshot.ActiveWidgetID != "term-side" {
		t.Fatalf("active widget not synchronized")
	}
}

func TestWorkspaceCreateAndCloseTerminalTabTools(t *testing.T) {
	t.Parallel()

	process := &interruptFakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := terminal.NewService(interruptFakeLauncher{process: process})
	t.Cleanup(service.Close)

	runtime := &Runtime{
		RepoRoot:  "/tmp/rterm",
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: service,
		Connections: mustNewConnectionsService(t),
	}

	createTool := runtime.workspaceCreateTerminalTabTool()
	output, err := createTool.Execute(context.Background(), toolruntime.ExecutionContext{}, createTerminalTabInput{Title: "Scratch"})
	if err != nil {
		t.Fatalf("create Execute error: %v", err)
	}
	payload, ok := output.(map[string]any)
	if !ok {
		t.Fatalf("unexpected create payload: %#v", output)
	}
	tabID, _ := payload["tab_id"].(string)
	widgetID, _ := payload["widget_id"].(string)
	if tabID == "" || widgetID == "" {
		t.Fatalf("expected generated identifiers: %#v", payload)
	}
	snapshot := runtime.Workspace.Snapshot()
	if snapshot.ActiveTabID != tabID || snapshot.ActiveWidgetID != widgetID {
		t.Fatalf("workspace not focused on created tab: %#v", snapshot)
	}

	closeTool := runtime.workspaceCloseTabTool()
	if _, err := closeTool.Execute(context.Background(), toolruntime.ExecutionContext{}, closeTabInput{TabID: tabID}); err != nil {
		t.Fatalf("close Execute error: %v", err)
	}
	if _, err := runtime.Terminals.GetState(widgetID); err == nil {
		t.Fatalf("expected closed tab session to be removed")
	}
}

func mustNewConnectionsService(t *testing.T) *connections.Service {
	t.Helper()
	service, err := connections.NewService(filepath.Join(t.TempDir(), "connections.json"))
	if err != nil {
		t.Fatalf("new connections service: %v", err)
	}
	return service
}

func TestWorkspaceRenameTabTool(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
	}

	tool := runtime.workspaceRenameTabTool()
	output, err := tool.Execute(context.Background(), toolruntime.ExecutionContext{}, renameTabInput{
		TabID: "tab-main",
		Title: "Project Shell",
	})
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	tab, ok := output.(workspace.Tab)
	if !ok {
		t.Fatalf("unexpected output type: %#v", output)
	}
	if tab.Title != "Project Shell" {
		t.Fatalf("unexpected title: %#v", tab)
	}
}

func TestWorkspaceSetTabPinnedTool(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
	}

	tool := runtime.workspaceSetTabPinnedTool()
	output, err := tool.Execute(context.Background(), toolruntime.ExecutionContext{}, setTabPinnedInput{
		TabID:  "tab-ops",
		Pinned: true,
	})
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	tab, ok := output.(workspace.Tab)
	if !ok {
		t.Fatalf("unexpected output type: %#v", output)
	}
	if !tab.Pinned {
		t.Fatalf("expected pinned tab: %#v", tab)
	}
}

func TestWorkspaceMoveTabTool(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
	}
	runtime.Workspace.SetTabPinned("tab-main", true)
	runtime.Workspace.SetTabPinned("tab-ops", true)

	tool := runtime.workspaceMoveTabTool()
	output, err := tool.Execute(context.Background(), toolruntime.ExecutionContext{}, moveTabInput{
		TabID:       "tab-ops",
		BeforeTabID: "tab-main",
	})
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}

	payload, ok := output.(map[string]any)
	if !ok {
		t.Fatalf("unexpected output type: %#v", output)
	}
	workspacePayload, ok := payload["workspace"].(workspace.Snapshot)
	if !ok {
		t.Fatalf("unexpected workspace payload: %#v", payload["workspace"])
	}
	if workspacePayload.Tabs[0].ID != "tab-ops" {
		t.Fatalf("expected moved tab first: %#v", workspacePayload.Tabs)
	}
}
