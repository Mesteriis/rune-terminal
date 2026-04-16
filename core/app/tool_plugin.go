package app

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

type pluginExampleEchoInput struct {
	Text string `json:"text"`
}

func (r *Runtime) pluginTools() []toolruntime.Definition {
	adapter := newRuntimeToolAdapter(r)
	return []toolruntime.Definition{
		adapter.pluginExampleEchoTool(),
	}
}

func (r *Runtime) pluginExampleEchoTool() toolruntime.Definition {
	return newRuntimeToolAdapter(r).pluginExampleEchoTool()
}

func (a *runtimeToolAdapter) pluginExampleEchoTool() toolruntime.Definition {
	base := toolruntime.Definition{
		Name:         "plugin.example_echo",
		Description:  "Echo text through the example side-process plugin.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"text":{"type":"string"}},"required":["text"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object","properties":{"text":{"type":"string"},"length":{"type":"integer"},"workspace_id":{"type":"string"},"repo_root":{"type":"string"}},"required":["text","length"],"additionalProperties":false}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"workspace:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetWorkspace,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			input, err := toolruntime.DecodeJSON[pluginExampleEchoInput](raw)
			if err != nil {
				return nil, err
			}
			if strings.TrimSpace(input.Text) == "" {
				return nil, toolruntime.InvalidInputError("text is required")
			}
			return input, nil
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(pluginExampleEchoInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "plugin example echo " + trimSummary(payload.Text),
					RequiredCapabilities: []string{"workspace:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(context.Context, toolruntime.ExecutionContext, any) (any, error) {
			return map[string]any{}, nil
		},
	}
	return toolruntime.PluginBackedDefinition(base, plugins.PluginSpec{
		Name:     "example.side_process",
		Protocol: plugins.ProtocolVersionV1,
		Timeout:  3 * time.Second,
		Process: plugins.ProcessConfig{
			Command: pluginExecutable(),
			Args:    []string{"plugin-example"},
		},
		Capabilities: []string{"tool.execute"},
	})
}

func pluginExecutable() string {
	executable, err := os.Executable()
	if err != nil || strings.TrimSpace(executable) == "" {
		return os.Args[0]
	}
	return executable
}
