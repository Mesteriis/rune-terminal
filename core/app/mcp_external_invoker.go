package app

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	client   *http.Client
	repoRoot string
}

func newExternalMCPInvoker(runtime *plugins.Runtime, repoRoot string) plugins.MCPInvoker {
	if runtime == nil {
		return nil
	}
	return &externalMCPInvoker{
		runtime:  runtime,
		client:   &http.Client{Timeout: 10 * time.Second},
		repoRoot: strings.TrimSpace(repoRoot),
	}
}

func (i *externalMCPInvoker) Invoke(
	ctx context.Context,
	spec plugins.MCPServerSpec,
	payload json.RawMessage,
) (json.RawMessage, error) {
	if spec.Type == plugins.MCPServerTypeRemote {
		return i.invokeRemote(ctx, spec, payload)
	}

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

type mcpRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type mcpRPCResponse struct {
	JSONRPC string `json:"jsonrpc"`
	ID      any    `json:"id"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type remoteMCPPayload struct {
	Method   string          `json:"method,omitempty"`
	Params   json.RawMessage `json:"params,omitempty"`
	ToolName string          `json:"tool_name,omitempty"`
	Input    json.RawMessage `json:"input,omitempty"`
}

func (i *externalMCPInvoker) invokeRemote(
	ctx context.Context,
	spec plugins.MCPServerSpec,
	payload json.RawMessage,
) (json.RawMessage, error) {
	if spec.Remote == nil || strings.TrimSpace(spec.Remote.Endpoint) == "" {
		return nil, fmt.Errorf("%w: remote endpoint is required", plugins.ErrInvalidPluginSpec)
	}

	initializeParams := json.RawMessage(`{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"runa-terminal","version":"1.0.0-rc1"}}`)
	if _, err := i.remoteRPC(ctx, spec, mcpRPCRequest{
		JSONRPC: "2.0",
		ID:      "init",
		Method:  "initialize",
		Params:  initializeParams,
	}); err != nil {
		return nil, err
	}

	request, err := parseRemoteMCPPayload(payload)
	if err != nil {
		return nil, err
	}
	return i.remoteRPC(ctx, spec, request)
}

func parseRemoteMCPPayload(payload json.RawMessage) (mcpRPCRequest, error) {
	trimmed := bytes.TrimSpace(payload)
	if len(trimmed) == 0 {
		return mcpRPCRequest{
			JSONRPC: "2.0",
			ID:      "tools-list",
			Method:  "tools/list",
			Params:  json.RawMessage(`{}`),
		}, nil
	}

	var parsed remoteMCPPayload
	if err := json.Unmarshal(trimmed, &parsed); err != nil {
		return mcpRPCRequest{}, fmt.Errorf("%w: payload must be a JSON object", plugins.ErrInvalidPluginSpec)
	}

	method := strings.TrimSpace(parsed.Method)
	if method == "" {
		toolName := strings.TrimSpace(parsed.ToolName)
		if toolName == "" {
			return mcpRPCRequest{}, fmt.Errorf("%w: method or tool_name is required for remote MCP invoke", plugins.ErrInvalidPluginSpec)
		}
		arguments := bytes.TrimSpace(parsed.Input)
		if len(arguments) == 0 {
			arguments = []byte(`{}`)
		}
		params, err := json.Marshal(map[string]any{
			"name":      toolName,
			"arguments": json.RawMessage(arguments),
		})
		if err != nil {
			return mcpRPCRequest{}, fmt.Errorf("%w: invalid remote tool input", plugins.ErrInvalidPluginSpec)
		}
		return mcpRPCRequest{
			JSONRPC: "2.0",
			ID:      "tool-call",
			Method:  "tools/call",
			Params:  params,
		}, nil
	}

	params := bytes.TrimSpace(parsed.Params)
	if len(params) == 0 {
		params = []byte(`{}`)
	}
	return mcpRPCRequest{
		JSONRPC: "2.0",
		ID:      method,
		Method:  method,
		Params:  params,
	}, nil
}

func (i *externalMCPInvoker) remoteRPC(
	ctx context.Context,
	spec plugins.MCPServerSpec,
	request mcpRPCRequest,
) (json.RawMessage, error) {
	if i.client == nil {
		i.client = &http.Client{Timeout: 10 * time.Second}
	}
	body, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	endpoint := strings.TrimSpace(spec.Remote.Endpoint)
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Accept", "application/json, text/event-stream")
	httpRequest.Header.Set("MCP-Protocol-Version", "2024-11-05")
	for key, value := range spec.Remote.Headers {
		name := strings.TrimSpace(key)
		if name == "" {
			continue
		}
		httpRequest.Header.Set(name, value)
	}

	response, err := i.client.Do(httpRequest)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	limitedBody, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if response.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("mcp remote request failed: status=%d body=%s", response.StatusCode, strings.TrimSpace(string(limitedBody)))
	}

	var rpcResponse mcpRPCResponse
	if err := json.Unmarshal(limitedBody, &rpcResponse); err != nil {
		return nil, fmt.Errorf("%w: remote MCP response must be valid JSON", plugins.ErrInvalidPluginSpec)
	}
	if rpcResponse.Error != nil {
		return nil, fmt.Errorf("mcp remote error: code=%d message=%s", rpcResponse.Error.Code, strings.TrimSpace(rpcResponse.Error.Message))
	}
	return limitedBody, nil
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
