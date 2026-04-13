package app

import (
	"context"
	"testing"

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
