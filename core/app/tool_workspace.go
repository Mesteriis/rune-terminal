package app

import (
	"context"
	"encoding/json"

	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/toolruntime"
)

func (r *Runtime) workspaceTools() []toolruntime.Definition {
	return []toolruntime.Definition{
		r.workspaceListWidgetsTool(),
		r.workspaceGetActiveWidgetTool(),
		r.workspaceFocusWidgetTool(),
	}
}

func (r *Runtime) workspaceListWidgetsTool() toolruntime.Definition {
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
			return map[string]any{"widgets": r.Workspace.ListWidgets()}, nil
		},
	}
}

func (r *Runtime) workspaceGetActiveWidgetTool() toolruntime.Definition {
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
			return r.Workspace.ActiveWidget()
		},
	}
}

func (r *Runtime) workspaceFocusWidgetTool() toolruntime.Definition {
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
			return r.Workspace.FocusWidget(input.(focusWidgetInput).WidgetID)
		},
	}
}
