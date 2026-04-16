package app

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

type selectConnectionInput struct {
	ConnectionID string `json:"connection_id"`
}

type checkConnectionInput struct {
	ConnectionID string `json:"connection_id"`
}

type saveSSHConnectionInput struct {
	ID           string `json:"id,omitempty"`
	Name         string `json:"name,omitempty"`
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
}

func (r *Runtime) connectionTools() []toolruntime.Definition {
	adapter := newRuntimeToolAdapter(r)
	return []toolruntime.Definition{
		adapter.connectionsListTool(),
		adapter.connectionsCheckTool(),
		adapter.connectionsSelectTool(),
		adapter.connectionsSaveSSHTool(),
	}
}

func (r *Runtime) connectionsListTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).connectionsListTool()
}

func (a *runtimeToolAdapter) connectionsListTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "connections.list",
		Description:  "List local and configured SSH connections.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object","properties":{"connections":{"type":"array"},"active_connection_id":{"type":"string"}},"required":["connections","active_connection_id"],"additionalProperties":false}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"connections:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "list connection catalog",
					RequiredCapabilities: []string{"connections:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return a.connectionsSnapshot(), nil
		},
	}
}

func (r *Runtime) connectionsSelectTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).connectionsSelectTool()
}

func (a *runtimeToolAdapter) connectionsSelectTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "connections.select",
		Description:  "Select the active connection for new shell launches.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"connection_id":{"type":"string"}},"required":["connection_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"connections:write"},
			ApprovalTier: policy.ApprovalTierSafe,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[selectConnectionInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(selectConnectionInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "select connection " + payload.ConnectionID,
					RequiredCapabilities: []string{"connections:write"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			snapshot, err := a.selectActiveConnection(input.(selectConnectionInput).ConnectionID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return snapshot, nil
		},
	}
}

func (r *Runtime) connectionsCheckTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).connectionsCheckTool()
}

func (a *runtimeToolAdapter) connectionsCheckTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "connections.check",
		Description:  "Run a local preflight check for a configured connection target.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"connection_id":{"type":"string"}},"required":["connection_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"connections:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[checkConnectionInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(checkConnectionInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "check connection " + payload.ConnectionID,
					RequiredCapabilities: []string{"connections:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(checkConnectionInput)
			connection, snapshot, err := a.checkConnection(ctx, payload.ConnectionID)
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return map[string]any{
				"connection":  connection,
				"connections": snapshot,
			}, nil
		},
	}
}

func (r *Runtime) connectionsSaveSSHTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).connectionsSaveSSHTool()
}

func (a *runtimeToolAdapter) connectionsSaveSSHTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "connections.save_ssh",
		Description:  "Create or update an SSH connection profile.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"host":{"type":"string"},"user":{"type":"string"},"port":{"type":"integer"},"identity_file":{"type":"string"}},"required":["host"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"connections:write"},
			ApprovalTier: policy.ApprovalTierModerate,
			Mutating:     true,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[saveSSHConnectionInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(saveSSHConnectionInput)
			summary := fmt.Sprintf("save ssh connection %s", trimSummary(payload.Name))
			if payload.Name == "" {
				summary = fmt.Sprintf("save ssh connection %s", trimSummary(payload.Host))
			}
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              summary,
					RequiredCapabilities: []string{"connections:write"},
					ApprovalTier:         policy.ApprovalTierModerate,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(saveSSHConnectionInput)
			connection, snapshot, err := a.saveSSHConnection(connections.SaveSSHInput{
				ID:           payload.ID,
				Name:         payload.Name,
				Host:         payload.Host,
				User:         payload.User,
				Port:         payload.Port,
				IdentityFile: payload.IdentityFile,
			})
			if err != nil {
				return nil, normalizeToolError(err)
			}
			return map[string]any{
				"connection": connection,
				"snapshot":   snapshot,
			}, nil
		},
	}
}
