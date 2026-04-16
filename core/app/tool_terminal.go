package app

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func (r *Runtime) terminalTools() []toolruntime.Definition {
	adapter := newRuntimeToolAdapter(r)
	return []toolruntime.Definition{
		adapter.termGetStateTool(),
		adapter.termSendInputTool(),
		adapter.termInterruptTool(),
	}
}

func (r *Runtime) termGetStateTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).termGetStateTool()
}

func (a *runtimeToolAdapter) termGetStateTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "term.get_state",
		Description:  "Get terminal runtime state for a widget.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"widget_id":{"type":"string"}},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"terminal:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWidget,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[widgetToolInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			widgetID, err := a.resolveWidgetID(input.(widgetToolInput).WidgetID)
			if err != nil {
				return toolruntime.OperationPlan{}, err
			}
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "get terminal state for " + widgetID,
					AffectedWidgets:      []string{widgetID},
					RequiredCapabilities: []string{"terminal:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			widgetID, err := a.resolveWidgetID(input.(widgetToolInput).WidgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			state, err := a.terminalGetState(widgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return state, nil
		},
	}
}

func (r *Runtime) termSendInputTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).termSendInputTool()
}

func (a *runtimeToolAdapter) termSendInputTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:        "term.send_input",
		Description: "Send input to a terminal session.",
		InputSchema: json.RawMessage(`{
      "type":"object",
      "properties":{
        "widget_id":{"type":"string"},
        "text":{"type":"string"},
        "append_newline":{"type":"boolean"}
      },
      "required":["text"],
      "additionalProperties":false
    }`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"terminal:input"},
			ApprovalTier: policy.ApprovalTierModerate,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWidget,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[sendInputToolInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(sendInputToolInput)
			widgetID, err := a.resolveWidgetID(payload.WidgetID)
			if err != nil {
				return toolruntime.OperationPlan{}, err
			}
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              fmt.Sprintf("send input to %s: %s", widgetID, trimSummary(payload.Text)),
					AffectedWidgets:      []string{widgetID},
					RequiredCapabilities: []string{"terminal:input"},
					ApprovalTier:         policy.ApprovalTierModerate,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(sendInputToolInput)
			widgetID, err := a.resolveWidgetID(payload.WidgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			result, err := a.terminalSendInput(widgetID, payload.Text, payload.AppendNewline)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return result, nil
		},
	}
}

func (r *Runtime) termInterruptTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).termInterruptTool()
}

func (a *runtimeToolAdapter) termInterruptTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "term.interrupt",
		Description:  "Send an interrupt signal to a terminal session.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"widget_id":{"type":"string"}},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"terminal:input"},
			ApprovalTier: policy.ApprovalTierModerate,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWidget,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[interruptToolInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			widgetID, err := a.resolveWidgetID(input.(interruptToolInput).WidgetID)
			if err != nil {
				return toolruntime.OperationPlan{}, err
			}
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "interrupt terminal session for " + widgetID,
					AffectedWidgets:      []string{widgetID},
					RequiredCapabilities: []string{"terminal:input"},
					ApprovalTier:         policy.ApprovalTierModerate,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			widgetID, err := a.resolveWidgetID(input.(interruptToolInput).WidgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			if err := a.terminalInterrupt(widgetID); err != nil {
				return nil, normalizeToolError(err)
			}
			state, err := a.terminalGetState(widgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return map[string]any{
				"widget_id":   widgetID,
				"interrupted": true,
				"status":      state.Status,
			}, nil
		},
	}
}
