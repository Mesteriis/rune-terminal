package example

import (
	"bufio"
	"bytes"
	"encoding/json"
	"testing"

	pluginruntime "github.com/Mesteriis/rune-terminal/core/plugins"
)

func TestRunHandlesHandshakeAndRequest(t *testing.T) {
	t.Parallel()

	input := bytes.NewBuffer(nil)
	if err := writeTestLine(input, pluginruntime.PluginHandshakeRequest{
		Type:            pluginruntime.MessageTypeHandshake,
		ProtocolVersion: pluginruntime.ProtocolVersionV1,
	}); err != nil {
		t.Fatalf("write handshake: %v", err)
	}
	if err := writeTestLine(input, pluginruntime.PluginRequest{
		Type:      pluginruntime.MessageTypeRequest,
		RequestID: "req-1",
		ToolName:  "plugin.example_echo",
		Context: pluginruntime.RequestContext{
			WorkspaceID: "ws-local",
			RepoRoot:    "/workspace/repo",
		},
		Input: json.RawMessage(`{"text":"hello plugin"}`),
	}); err != nil {
		t.Fatalf("write request: %v", err)
	}

	output := bytes.NewBuffer(nil)
	if err := Run(input, output); err != nil {
		t.Fatalf("Run error: %v", err)
	}

	reader := bufio.NewReader(output)
	var handshake pluginruntime.PluginHandshakeResponse
	if err := readTestLine(reader, &handshake); err != nil {
		t.Fatalf("read handshake response: %v", err)
	}
	if handshake.Manifest.PluginID != "example.side_process" {
		t.Fatalf("unexpected plugin manifest: %#v", handshake.Manifest)
	}
	if len(handshake.Manifest.Capabilities) != 1 || handshake.Manifest.Capabilities[0] != "tool.execute" {
		t.Fatalf("unexpected plugin capabilities: %#v", handshake.Manifest.Capabilities)
	}

	var response pluginruntime.PluginResponse
	if err := readTestLine(reader, &response); err != nil {
		t.Fatalf("read execute response: %v", err)
	}
	if response.Status != pluginruntime.PluginResponseStatusOK {
		t.Fatalf("unexpected response status: %#v", response)
	}
	var payload map[string]any
	if err := json.Unmarshal(response.Output, &payload); err != nil {
		t.Fatalf("output unmarshal: %v", err)
	}
	if payload["text"] != "hello plugin" || payload["workspace_id"] != "ws-local" {
		t.Fatalf("unexpected output payload: %#v", payload)
	}
}

func TestRunReturnsErrorResponseForInvalidInput(t *testing.T) {
	t.Parallel()

	input := bytes.NewBuffer(nil)
	_ = writeTestLine(input, pluginruntime.PluginHandshakeRequest{
		Type:            pluginruntime.MessageTypeHandshake,
		ProtocolVersion: pluginruntime.ProtocolVersionV1,
	})
	_ = writeTestLine(input, pluginruntime.PluginRequest{
		Type:      pluginruntime.MessageTypeRequest,
		RequestID: "req-2",
		ToolName:  "plugin.example_echo",
		Input:     json.RawMessage(`{"text":""}`),
	})

	output := bytes.NewBuffer(nil)
	if err := Run(input, output); err != nil {
		t.Fatalf("Run error: %v", err)
	}

	reader := bufio.NewReader(output)
	var handshake pluginruntime.PluginHandshakeResponse
	if err := readTestLine(reader, &handshake); err != nil {
		t.Fatalf("read handshake response: %v", err)
	}
	var response pluginruntime.PluginResponse
	if err := readTestLine(reader, &response); err != nil {
		t.Fatalf("read error response: %v", err)
	}
	if response.Status != pluginruntime.PluginResponseStatusError || response.Error == nil {
		t.Fatalf("expected error response, got %#v", response)
	}
	if response.Error.Code != "invalid_input" {
		t.Fatalf("unexpected plugin error code: %#v", response.Error)
	}
}

func writeTestLine(buffer *bytes.Buffer, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	buffer.Write(payload)
	buffer.WriteByte('\n')
	return nil
}

func readTestLine(reader *bufio.Reader, target any) error {
	line, err := reader.ReadBytes('\n')
	if err != nil {
		return err
	}
	return json.Unmarshal(line, target)
}
