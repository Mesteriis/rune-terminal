package app

import (
	"testing"

	"github.com/Mesteriis/rune-terminal/core/config"
	"github.com/Mesteriis/rune-terminal/core/plugins"
)

func TestMCPRegistryPersistenceRestoresRemoteServersAsStopped(t *testing.T) {
	t.Parallel()

	paths := config.Resolve(t.TempDir())

	runtimeA := &Runtime{
		Paths: paths,
		MCP:   plugins.NewMCPRuntime(nil, nil, nil),
	}
	defer runtimeA.MCP.Close()

	if err := runtimeA.registerMCPServers(); err != nil {
		t.Fatalf("registerMCPServers(runtimeA) error: %v", err)
	}
	if _, err := runtimeA.RegisterMCPServer(MCPRegistrationRequest{
		ID:       "mcp.context7",
		Type:     "remote",
		Endpoint: "http://127.0.0.1:8123/mcp",
		Headers: map[string]string{
			"Authorization": "Bearer test",
		},
	}); err != nil {
		t.Fatalf("RegisterMCPServer error: %v", err)
	}
	if _, err := runtimeA.SetMCPServerEnabled("mcp.context7", false); err != nil {
		t.Fatalf("SetMCPServerEnabled error: %v", err)
	}

	runtimeB := &Runtime{
		Paths: paths,
		MCP:   plugins.NewMCPRuntime(nil, nil, nil),
	}
	defer runtimeB.MCP.Close()

	if err := runtimeB.registerMCPServers(); err != nil {
		t.Fatalf("registerMCPServers(runtimeB) error: %v", err)
	}

	servers := runtimeB.ListMCPServers()
	var context7 plugins.MCPServerSnapshot
	found := false
	for _, server := range servers {
		if server.ID == "mcp.context7" {
			context7 = server
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected restored remote server in registry, got %#v", servers)
	}
	if context7.State != plugins.MCPStateStopped {
		t.Fatalf("expected restored server state stopped, got %q", context7.State)
	}
	if context7.Active {
		t.Fatalf("expected restored server active=false")
	}
	if context7.Enabled {
		t.Fatalf("expected restored server enabled=false")
	}
	if context7.Endpoint != "http://127.0.0.1:8123/mcp" {
		t.Fatalf("unexpected endpoint: %q", context7.Endpoint)
	}
}
