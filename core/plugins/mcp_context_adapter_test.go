package plugins

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestMCPContextAdapterTrimsNestedPayload(t *testing.T) {
	t.Parallel()

	adapter := MCPContextAdapter{
		MaxBytes:  256,
		MaxDepth:  2,
		MaxItems:  2,
		MaxString: 12,
	}
	raw := json.RawMessage(`{
		"summary":"This summary is longer than the configured max string size",
		"records":[
			{"id":"1","name":"alpha"},
			{"id":"2","name":"beta"},
			{"id":"3","name":"gamma"}
		],
		"debug":{"trace":"12345","stack":"line-1\nline-2"}
	}`)

	payload, err := adapter.Adapt(raw)
	if err != nil {
		t.Fatalf("Adapt error: %v", err)
	}
	if !payload.Included {
		t.Fatalf("expected included=true")
	}
	encoded, err := json.Marshal(payload.Payload)
	if err != nil {
		t.Fatalf("Marshal payload error: %v", err)
	}
	if len(encoded) > adapter.MaxBytes {
		t.Fatalf("expected bounded payload <= %d bytes, got %d", adapter.MaxBytes, len(encoded))
	}
	text := string(encoded)
	if !strings.Contains(text, "_trimmed_fields") {
		t.Fatalf("expected trimmed marker in payload: %s", text)
	}
}

func TestMCPInvokeContextInclusionIsExplicit(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	runtime := NewMCPRuntimeWithOptions(registry, &testMCPSpawner{}, MCPInvokerFunc(
		func(context.Context, MCPServerSpec, json.RawMessage) (json.RawMessage, error) {
			return json.RawMessage(`{"result":"ok","details":{"very":"large"}}`), nil
		},
	), MCPRuntimeOptions{
		IdleCheckInterval: -1,
	})
	defer runtime.Close()

	withoutContext, err := runtime.Invoke(context.Background(), MCPInvokeRequest{
		ServerID:           "mcp.docs",
		AllowOnDemandStart: true,
	})
	if err != nil {
		t.Fatalf("Invoke without context error: %v", err)
	}
	if withoutContext.Context != nil {
		t.Fatalf("expected nil context unless explicitly requested, got %#v", withoutContext.Context)
	}

	withContext, err := runtime.Invoke(context.Background(), MCPInvokeRequest{
		ServerID:           "mcp.docs",
		AllowOnDemandStart: true,
		IncludeContext:     true,
	})
	if err != nil {
		t.Fatalf("Invoke with context error: %v", err)
	}
	if withContext.Context == nil || !withContext.Context.Included {
		t.Fatalf("expected explicit context payload, got %#v", withContext.Context)
	}
}
