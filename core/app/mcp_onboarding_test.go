package app

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNormalizeRemoteMCPRegistrationRequest(t *testing.T) {
	t.Parallel()

	normalized, err := NormalizeRemoteMCPRegistrationRequest(MCPRegistrationRequest{
		ID:       " mcp.context7 ",
		Type:     "remote",
		Endpoint: " https://mcp.context7.com/mcp ",
		Headers: map[string]string{
			" Authorization ": "Bearer token",
		},
	}, "")
	if err != nil {
		t.Fatalf("NormalizeRemoteMCPRegistrationRequest error: %v", err)
	}

	if normalized.ID != "mcp.context7" {
		t.Fatalf("expected trimmed id, got %#v", normalized)
	}
	if normalized.Endpoint != "https://mcp.context7.com/mcp" {
		t.Fatalf("expected normalized endpoint, got %#v", normalized)
	}
	if normalized.Headers["Authorization"] != "Bearer token" {
		t.Fatalf("expected normalized headers, got %#v", normalized.Headers)
	}
}

func TestNormalizeRemoteMCPRegistrationRequestRejectsInvalidHeaders(t *testing.T) {
	t.Parallel()

	_, err := NormalizeRemoteMCPRegistrationRequest(MCPRegistrationRequest{
		ID:       "mcp.context7",
		Type:     "remote",
		Endpoint: "https://mcp.context7.com/mcp",
		Headers: map[string]string{
			"": "token",
		},
	}, "")
	if err == nil {
		t.Fatalf("expected invalid header error")
	}
}

func TestProbeRemoteMCPServerReportsReadyWithToolCount(t *testing.T) {
	t.Parallel()

	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		switch callCount {
		case 1:
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"probe-init","result":{"protocolVersion":"2024-11-05","serverInfo":{"name":"Context7","version":"1.2.3"}}}`))
		case 2:
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"jsonrpc":"2.0","id":"probe-tools","result":{"tools":[{"name":"docs.search"},{"name":"docs.read"}]}}`))
		default:
			t.Fatalf("unexpected extra probe call")
		}
	}))
	defer server.Close()

	result, err := probeRemoteMCPServer(context.Background(), server.Client(), server.URL, map[string]string{
		"Authorization": "Bearer token",
	})
	if err != nil {
		t.Fatalf("probeRemoteMCPServer error: %v", err)
	}

	if result.Status != MCPProbeStatusReady || !result.Reachable {
		t.Fatalf("expected ready probe result, got %#v", result)
	}
	if result.ToolCount != 2 {
		t.Fatalf("expected tool count=2, got %#v", result)
	}
	if result.ServerName != "Context7" || result.ServerVersion != "1.2.3" {
		t.Fatalf("expected server info, got %#v", result)
	}
}

func TestProbeRemoteMCPServerReportsAuthRequired(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer server.Close()

	result, err := probeRemoteMCPServer(context.Background(), server.Client(), server.URL, nil)
	if err != nil {
		t.Fatalf("probeRemoteMCPServer error: %v", err)
	}

	if result.Status != MCPProbeStatusAuthRequired {
		t.Fatalf("expected auth-required probe result, got %#v", result)
	}
	if !result.Reachable || result.HTTPStatus != http.StatusUnauthorized {
		t.Fatalf("expected reachable auth-required result, got %#v", result)
	}
}
