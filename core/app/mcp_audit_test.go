package app

import (
	"strings"
	"testing"
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
