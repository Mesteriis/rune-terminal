package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func (r *Runtime) workspaceTools() []toolruntime.Definition {
	adapter := newRuntimeToolAdapter(r)
	return []toolruntime.Definition{
		adapter.workspaceListTabsTool(),
		adapter.workspaceGetActiveTabTool(),
		adapter.workspaceFocusTabTool(),
		adapter.workspaceMoveTabTool(),
		adapter.workspaceRenameTabTool(),
		adapter.workspaceSetTabPinnedTool(),
		adapter.workspaceCreateTerminalTabTool(),
		adapter.workspaceCloseTabTool(),
		adapter.workspaceListWidgetsTool(),
		adapter.workspaceGetActiveWidgetTool(),
		adapter.workspaceFocusWidgetTool(),
	}
}

func (r *Runtime) workspaceMoveTabTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceMoveTabTool()
}

func (a *runtimeToolAdapter) workspaceMoveTabTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.move_tab",
		Description:  "Move a tab before another tab in the current workspace.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"tab_id":{"type":"string"},"before_tab_id":{"type":"string"}},"required":["tab_id","before_tab_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:write"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[moveTabInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(moveTabInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              fmt.Sprintf("move tab %s before %s", payload.TabID, payload.BeforeTabID),
					RequiredCapabilities: []string{"workspace:write"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			snapshot, err := a.moveTab(input.(moveTabInput).TabID, input.(moveTabInput).BeforeTabID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return map[string]any{"workspace": snapshot}, nil
		},
	}
}

func (r *Runtime) workspaceRenameTabTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceRenameTabTool()
}

func (a *runtimeToolAdapter) workspaceRenameTabTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.rename_tab",
		Description:  "Rename a tab in the current workspace.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"tab_id":{"type":"string"},"title":{"type":"string"}},"required":["tab_id","title"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:write"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[renameTabInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(renameTabInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              fmt.Sprintf("rename tab %s to %s", payload.TabID, trimSummary(payload.Title)),
					RequiredCapabilities: []string{"workspace:write"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			result, err := a.renameTab(input.(renameTabInput).TabID, input.(renameTabInput).Title)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return result.Tab, nil
		},
	}
}

func (r *Runtime) workspaceSetTabPinnedTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceSetTabPinnedTool()
}

func (a *runtimeToolAdapter) workspaceSetTabPinnedTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.set_tab_pinned",
		Description:  "Pin or unpin a tab in the current workspace.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"tab_id":{"type":"string"},"pinned":{"type":"boolean"}},"required":["tab_id","pinned"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:write"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[setTabPinnedInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(setTabPinnedInput)
			verb := "unpin"
			if payload.Pinned {
				verb = "pin"
			}
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              fmt.Sprintf("%s tab %s", verb, payload.TabID),
					RequiredCapabilities: []string{"workspace:write"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			result, err := a.setTabPinned(input.(setTabPinnedInput).TabID, input.(setTabPinnedInput).Pinned)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return result.Tab, nil
		},
	}
}

func (r *Runtime) workspaceListTabsTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceListTabsTool()
}

func (a *runtimeToolAdapter) workspaceListTabsTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:        "workspace.list_tabs",
		Description: "List tabs in the current workspace.",
		InputSchema: json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{
      "type":"object",
      "properties":{"tabs":{"type":"array"}},
      "required":["tabs"],
      "additionalProperties":false
    }`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "list workspace tabs",
					RequiredCapabilities: []string{"workspace:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"tabs": a.listTabs()}, nil
		},
	}
}

func (r *Runtime) workspaceGetActiveTabTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceGetActiveTabTool()
}

func (a *runtimeToolAdapter) workspaceGetActiveTabTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.get_active_tab",
		Description:  "Get the currently active tab.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "get active tab",
					RequiredCapabilities: []string{"workspace:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			tab, err := a.activeTab()
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return tab, nil
		},
	}
}

func (r *Runtime) workspaceFocusTabTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceFocusTabTool()
}

func (a *runtimeToolAdapter) workspaceFocusTabTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.focus_tab",
		Description:  "Focus a tab in the current workspace.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"tab_id":{"type":"string"}},"required":["tab_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:focus"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[focusTabInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(focusTabInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "focus tab " + payload.TabID,
					RequiredCapabilities: []string{"workspace:focus"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			tab, err := a.focusTab(input.(focusTabInput).TabID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return tab, nil
		},
	}
}

func (r *Runtime) workspaceCreateTerminalTabTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceCreateTerminalTabTool()
}

func (a *runtimeToolAdapter) workspaceCreateTerminalTabTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.create_terminal_tab",
		Description:  "Create a new terminal tab and focus it.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"title":{"type":"string"},"connection_id":{"type":"string"}},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:write", "terminal:spawn"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[createTerminalTabInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(createTerminalTabInput)
			title := strings.TrimSpace(payload.Title)
			if title == "" {
				title = "New Shell"
			}
			target := title
			if payload.ConnectionID != "" {
				target += " on " + payload.ConnectionID
			}
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "create terminal tab " + target,
					RequiredCapabilities: []string{"workspace:write", "terminal:spawn"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(createTerminalTabInput)
			result, err := a.createTerminalTabWithConnection(ctx, payload.Title, payload.ConnectionID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return map[string]any{
				"tab_id":    result.TabID,
				"widget_id": result.WidgetID,
				"workspace": result.Workspace,
			}, nil
		},
	}
}

func (r *Runtime) workspaceCloseTabTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceCloseTabTool()
}

func (a *runtimeToolAdapter) workspaceCloseTabTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.close_tab",
		Description:  "Close a tab and its terminal session.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"tab_id":{"type":"string"}},"required":["tab_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:write", "terminal:close"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[closeTabInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(closeTabInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "close tab " + payload.TabID,
					RequiredCapabilities: []string{"workspace:write", "terminal:close"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			result, err := a.closeTab(input.(closeTabInput).TabID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return map[string]any{
				"closed_tab_id": result.ClosedTabID,
				"workspace":     result.Workspace,
			}, nil
		},
	}
}

func (r *Runtime) workspaceListWidgetsTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceListWidgetsTool()
}

func (a *runtimeToolAdapter) workspaceListWidgetsTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:        "workspace.list_widgets",
		Description: "List widgets in the current workspace.",
		InputSchema: json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{
      "type":"object",
      "properties":{"widgets":{"type":"array"}},
      "required":["widgets"],
      "additionalProperties":false
    }`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "list workspace widgets",
					RequiredCapabilities: []string{"workspace:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"widgets": a.listWidgets()}, nil
		},
	}
}

func (r *Runtime) workspaceGetActiveWidgetTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceGetActiveWidgetTool()
}

func (a *runtimeToolAdapter) workspaceGetActiveWidgetTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.get_active_widget",
		Description:  "Get the currently focused widget.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "get active widget",
					RequiredCapabilities: []string{"workspace:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			widget, err := a.activeWidget()
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return widget, nil
		},
	}
}

func (r *Runtime) workspaceFocusWidgetTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).workspaceFocusWidgetTool()
}

func (a *runtimeToolAdapter) workspaceFocusWidgetTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "workspace.focus_widget",
		Description:  "Focus a widget in the current workspace.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"widget_id":{"type":"string"}},"required":["widget_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"widget:focus"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWidget,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[focusWidgetInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(focusWidgetInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "focus widget " + payload.WidgetID,
					AffectedWidgets:      []string{payload.WidgetID},
					RequiredCapabilities: []string{"widget:focus"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			widget, err := a.focusWidget(input.(focusWidgetInput).WidgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return widget, nil
		},
	}
}
