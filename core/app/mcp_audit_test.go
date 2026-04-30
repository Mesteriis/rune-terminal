package app

import (
	"context"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

func TestMCPLifecycleAuditSummaryRedactsEndpointSecrets(t *testing.T) {
	t.Parallel()

	summary := mcpLifecycleAuditSummary(
		"register",
		"mcp.remote",
		"https://user:secret@mcp.example.test/mcp?token=secret#secret",
	)

	if strings.Contains(summary, "secret") || strings.Contains(summary, "token=") || strings.Contains(summary, "user:") {
		t.Fatalf("expected endpoint secrets to be redacted from audit summary, got %q", summary)
	}
	if !strings.Contains(summary, "endpoint=https://mcp.example.test/mcp") {
		t.Fatalf("expected sanitized endpoint in audit summary, got %q", summary)
	}
}

func TestInvokeMCPDoesNotRequireAuditLog(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		MCP: plugins.NewMCPRuntime(nil, &mcpPersistenceSpawner{}, nil),
	}
	defer runtime.MCP.Close()

	if err := runtime.registerMCPServers(); err != nil {
		t.Fatalf("registerMCPServers error: %v", err)
	}
	if _, err := runtime.InvokeMCP(context.Background(), plugins.MCPInvokeRequest{
		ServerID:           "mcp.example",
		AllowOnDemandStart: true,
		WorkspaceID:        "ws-default",
	}); err != nil {
		t.Fatalf("InvokeMCP error: %v", err)
	}
}
