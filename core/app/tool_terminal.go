package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/connections"
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
      "required":["widget_id","text"],
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
			widgetID, err := requireExplicitTerminalWidgetID(payload.WidgetID)
			if err != nil {
				return toolruntime.OperationPlan{}, err
			}
			if err := requireExplicitTerminalExecutionContext(execCtx, widgetID); err != nil {
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
			widgetID, err := requireExplicitTerminalWidgetID(payload.WidgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			if err := requireExplicitTerminalExecutionContext(execCtx, widgetID); err != nil {
				return nil, normalizeToolError(err)
			}
			if err := a.ensureExecutionTargetsWidget(execCtx, widgetID); err != nil {
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
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"widget_id":{"type":"string"}},"required":["widget_id"],"additionalProperties":false}`),
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
			widgetID, err := requireExplicitTerminalWidgetID(input.(interruptToolInput).WidgetID)
			if err != nil {
				return toolruntime.OperationPlan{}, err
			}
			if err := requireExplicitTerminalExecutionContext(execCtx, widgetID); err != nil {
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
			widgetID, err := requireExplicitTerminalWidgetID(input.(interruptToolInput).WidgetID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			if err := requireExplicitTerminalExecutionContext(execCtx, widgetID); err != nil {
				return nil, normalizeToolError(err)
			}
			if err := a.ensureExecutionTargetsWidget(execCtx, widgetID); err != nil {
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

func requireExplicitTerminalWidgetID(widgetID string) (string, error) {
	trimmedWidgetID := strings.TrimSpace(widgetID)
	if trimmedWidgetID == "" {
		return "", toolruntime.InvalidInputError("input.widget_id is required")
	}
	return trimmedWidgetID, nil
}

func requireExplicitTerminalExecutionContext(execCtx toolruntime.ExecutionContext, widgetID string) error {
	activeWidgetID := strings.TrimSpace(execCtx.ActiveWidgetID)
	if activeWidgetID == "" {
		return toolruntime.InvalidInputError("context.active_widget_id is required")
	}
	if activeWidgetID != widgetID {
		return toolruntime.InvalidInputError("context.active_widget_id must match input.widget_id")
	}
	if strings.TrimSpace(execCtx.TargetSession) == "" {
		return toolruntime.InvalidInputError("context.target_session is required")
	}
	if strings.TrimSpace(execCtx.TargetConnectionID) == "" {
		return toolruntime.InvalidInputError("context.target_connection_id is required")
	}
	return nil
}

func (a *runtimeToolAdapter) ensureExecutionTargetsWidget(execCtx toolruntime.ExecutionContext, widgetID string) error {
	expectedSession := strings.TrimSpace(execCtx.TargetSession)
	expectedConnectionID := strings.TrimSpace(execCtx.TargetConnectionID)
	state, err := a.terminalGetState(widgetID)
	if err != nil {
		return err
	}
	actualSession := "local"
	if state.ConnectionKind == "ssh" {
		actualSession = "remote"
	}
	if expectedSession != "" && expectedSession != actualSession {
		return fmt.Errorf(
			"%w: requested %s session but widget %s is %s",
			connections.ErrInvalidConnection,
			expectedSession,
			widgetID,
			actualSession,
		)
	}
	if expectedConnectionID != "" && state.ConnectionID != "" && expectedConnectionID != state.ConnectionID {
		return fmt.Errorf(
			"%w: requested connection %s but widget %s is bound to %s",
			connections.ErrInvalidConnection,
			expectedConnectionID,
			widgetID,
			state.ConnectionID,
		)
	}
	return nil
}
