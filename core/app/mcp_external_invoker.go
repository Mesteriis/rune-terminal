package app

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

const defaultMCPPluginToolName = "plugin.example_echo"

type externalMCPInvokeEnvelope struct {
	ToolName string          `json:"tool_name,omitempty"`
	Input    json.RawMessage `json:"input,omitempty"`
}

type externalMCPInvoker struct {
	runtime  *plugins.Runtime
	repoRoot string
}

func newExternalMCPInvoker(runtime *plugins.Runtime, repoRoot string) plugins.MCPInvoker {
	if runtime == nil {
		return nil
	}
	return &externalMCPInvoker{
		runtime:  runtime,
		repoRoot: strings.TrimSpace(repoRoot),
	}
}

func (i *externalMCPInvoker) Invoke(
	ctx context.Context,
	spec plugins.MCPServerSpec,
	payload json.RawMessage,
) (json.RawMessage, error) {
	pluginName, defaultToolName := mcpPluginBinding(spec)
	toolName, input := parseExternalMCPPayload(payload, defaultToolName)

	result, err := i.runtime.Invoke(ctx, plugins.PluginSpec{
		Name:     pluginName,
		Protocol: plugins.ProtocolVersionV1,
		Timeout:  5 * time.Second,
		Process:  spec.Process,
	}, plugins.InvokeRequest{
		ToolName: toolName,
		Input:    input,
		Context: plugins.RequestContext{
			RepoRoot: i.repoRoot,
		},
	})
	if err != nil {
		return nil, err
	}
	return result.Output, nil
}

func mcpPluginBinding(spec plugins.MCPServerSpec) (string, string) {
	serverID := strings.TrimSpace(spec.ID)
	switch serverID {
	case "mcp.example":
		return "example.side_process", defaultMCPPluginToolName
	default:
		return serverID, defaultMCPPluginToolName
	}
}

func parseExternalMCPPayload(payload json.RawMessage, defaultToolName string) (string, json.RawMessage) {
	trimmed := bytes.TrimSpace(payload)
	if len(trimmed) == 0 {
		return defaultToolName, json.RawMessage(`{}`)
	}
	var envelope externalMCPInvokeEnvelope
	if err := json.Unmarshal(trimmed, &envelope); err != nil {
		return defaultToolName, trimmed
	}
	toolName := strings.TrimSpace(envelope.ToolName)
	if toolName == "" {
		return defaultToolName, trimmed
	}
	input := bytes.TrimSpace(envelope.Input)
	if len(input) == 0 {
		input = []byte("{}")
	}
	return toolName, input
}
