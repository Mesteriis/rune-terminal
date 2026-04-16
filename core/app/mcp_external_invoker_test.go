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

func TestParseRemoteMCPPayloadDefaultsToToolsList(t *testing.T) {
	t.Parallel()

	request, err := parseRemoteMCPPayload(nil)
	if err != nil {
		t.Fatalf("parseRemoteMCPPayload error: %v", err)
	}
	if request.Method != "tools/list" {
		t.Fatalf("expected tools/list default method, got %q", request.Method)
	}
	if string(request.Params) != "{}" {
		t.Fatalf("unexpected default params: %s", string(request.Params))
	}
}

func TestParseRemoteMCPPayloadFromToolEnvelope(t *testing.T) {
	t.Parallel()

	request, err := parseRemoteMCPPayload(json.RawMessage(`{"tool_name":"resolve-library-id","input":{"query":"react","libraryName":"react"}}`))
	if err != nil {
		t.Fatalf("parseRemoteMCPPayload error: %v", err)
	}
	if request.Method != "tools/call" {
		t.Fatalf("expected tools/call, got %q", request.Method)
	}
	var params map[string]any
	if err := json.Unmarshal(request.Params, &params); err != nil {
		t.Fatalf("unmarshal params: %v", err)
	}
	if params["name"] != "resolve-library-id" {
		t.Fatalf("unexpected tool name in params: %#v", params)
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
