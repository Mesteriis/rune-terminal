package app

import (
	"encoding/json"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

func TestMCPPluginBindingUsesKnownExampleDefaults(t *testing.T) {
	t.Parallel()

	name, tool := mcpPluginBinding(plugins.MCPServerSpec{ID: "mcp.example"})
	if name != "example.side_process" || tool != defaultMCPPluginToolName {
		t.Fatalf("unexpected mcp.example binding: name=%q tool=%q", name, tool)
	}
}

func TestParseExternalMCPPayloadUsesEnvelopeToolAndInput(t *testing.T) {
	t.Parallel()

	toolName, input := parseExternalMCPPayload(json.RawMessage(`{"tool_name":"plugin.custom","input":{"x":1}}`), defaultMCPPluginToolName)
	if toolName != "plugin.custom" {
		t.Fatalf("unexpected tool name: %q", toolName)
	}
	if string(input) != `{"x":1}` {
		t.Fatalf("unexpected envelope input: %s", string(input))
	}
}

func TestParseExternalMCPPayloadFallsBackToDefaultTool(t *testing.T) {
	t.Parallel()

	toolName, input := parseExternalMCPPayload(json.RawMessage(`{"text":"hello"}`), defaultMCPPluginToolName)
	if toolName != defaultMCPPluginToolName {
		t.Fatalf("expected default tool fallback, got %q", toolName)
	}
	if string(input) != `{"text":"hello"}` {
		t.Fatalf("unexpected fallback input: %s", string(input))
	}
}
