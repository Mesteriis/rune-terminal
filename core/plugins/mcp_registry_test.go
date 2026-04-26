package plugins

import (
	"errors"
	"testing"
	"time"
)

func TestMCPRegistryTracksServerLifecycleFields(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.example",
		Process: ProcessConfig{
			Command: "/tmp/mcp-example",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	registered, err := registry.Get("mcp.example")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if registered.State != MCPStateStopped {
		t.Fatalf("expected default stopped state, got %q", registered.State)
	}
	if registered.Active {
		t.Fatalf("expected active=false by default")
	}
	if !registered.Enabled {
		t.Fatalf("expected enabled=true by default")
	}
	if !registered.LastUsed.IsZero() {
		t.Fatalf("expected zero last_used by default, got %s", registered.LastUsed)
	}

	usedAt := time.Date(2026, 4, 16, 11, 25, 0, 0, time.UTC)
	if err := registry.SetState("mcp.example", MCPStateActive); err != nil {
		t.Fatalf("SetState error: %v", err)
	}
	if err := registry.SetActive("mcp.example", true); err != nil {
		t.Fatalf("SetActive error: %v", err)
	}
	if err := registry.Touch("mcp.example", usedAt); err != nil {
		t.Fatalf("Touch error: %v", err)
	}

	updated, err := registry.Get("mcp.example")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if updated.State != MCPStateActive {
		t.Fatalf("expected active state, got %q", updated.State)
	}
	if !updated.Active {
		t.Fatalf("expected active=true")
	}
	if !updated.Enabled {
		t.Fatalf("expected enabled=true")
	}
	if !updated.LastUsed.Equal(usedAt) {
		t.Fatalf("expected last_used %s, got %s", usedAt, updated.LastUsed)
	}
}

func TestMCPRegistryRejectsDuplicateIDs(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	spec := MCPServerSpec{
		ID: "mcp.example",
		Process: ProcessConfig{
			Command: "/tmp/mcp-example",
		},
	}
	if err := registry.Register(spec); err != nil {
		t.Fatalf("first Register error: %v", err)
	}
	err := registry.Register(spec)
	if !errors.Is(err, ErrMCPServerRegistered) {
		t.Fatalf("expected duplicate registration error, got %v", err)
	}
}

func TestMCPRegistryListIsSorted(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	for _, id := range []string{"mcp.zulu", "mcp.alpha"} {
		if err := registry.Register(MCPServerSpec{
			ID: id,
			Process: ProcessConfig{
				Command: "/tmp/" + id,
			},
		}); err != nil {
			t.Fatalf("Register(%s) error: %v", id, err)
		}
	}

	list := registry.List()
	if len(list) != 2 {
		t.Fatalf("expected 2 servers, got %d", len(list))
	}
	if list[0].ID != "mcp.alpha" || list[1].ID != "mcp.zulu" {
		t.Fatalf("expected sorted IDs, got %#v", list)
	}
}

func TestMCPRegistrySetEnabled(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.example",
		Process: ProcessConfig{
			Command: "/tmp/mcp-example",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	if err := registry.SetEnabled("mcp.example", false); err != nil {
		t.Fatalf("SetEnabled error: %v", err)
	}
	snapshot, err := registry.Get("mcp.example")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if snapshot.Enabled {
		t.Fatalf("expected enabled=false, got %#v", snapshot)
	}
}

func TestMCPRegistryRegisterRemoteServer(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID:   "mcp.context7",
		Type: MCPServerTypeRemote,
		Remote: &MCPRemoteConfig{
			Endpoint: "https://mcp.context7.com/mcp",
			Headers: map[string]string{
				"X-Context7-API-Key": "token",
			},
		},
	}); err != nil {
		t.Fatalf("Register(remote) error: %v", err)
	}

	snapshot, err := registry.Get("mcp.context7")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if snapshot.Type != MCPServerTypeRemote {
		t.Fatalf("expected remote type, got %#v", snapshot)
	}
	if snapshot.Endpoint != "https://mcp.context7.com/mcp" {
		t.Fatalf("unexpected endpoint in snapshot: %#v", snapshot)
	}

	spec, err := registry.Spec("mcp.context7")
	if err != nil {
		t.Fatalf("Spec error: %v", err)
	}
	if spec.Remote == nil || spec.Remote.Endpoint != "https://mcp.context7.com/mcp" {
		t.Fatalf("unexpected remote spec: %#v", spec)
	}
	if spec.Remote.Headers["X-Context7-API-Key"] != "token" {
		t.Fatalf("expected copied headers, got %#v", spec.Remote.Headers)
	}
}

func TestMCPRegistryUpdateRemoteServerPreservesLifecycleFields(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID:   "mcp.context7",
		Type: MCPServerTypeRemote,
		Remote: &MCPRemoteConfig{
			Endpoint: "https://mcp.context7.com/mcp",
			Headers: map[string]string{
				"Authorization": "Bearer old",
			},
		},
	}); err != nil {
		t.Fatalf("Register(remote) error: %v", err)
	}

	usedAt := time.Date(2026, 4, 26, 10, 0, 0, 0, time.UTC)
	if err := registry.SetState("mcp.context7", MCPStateIdle); err != nil {
		t.Fatalf("SetState error: %v", err)
	}
	if err := registry.SetActive("mcp.context7", true); err != nil {
		t.Fatalf("SetActive error: %v", err)
	}
	if err := registry.Touch("mcp.context7", usedAt); err != nil {
		t.Fatalf("Touch error: %v", err)
	}
	if err := registry.SetEnabled("mcp.context7", false); err != nil {
		t.Fatalf("SetEnabled error: %v", err)
	}

	if err := registry.Update(MCPServerSpec{
		ID:   "mcp.context7",
		Type: MCPServerTypeRemote,
		Remote: &MCPRemoteConfig{
			Endpoint: "https://mcp.context7.com/v2",
			Headers: map[string]string{
				"Authorization": "Bearer new",
			},
		},
	}); err != nil {
		t.Fatalf("Update(remote) error: %v", err)
	}

	snapshot, err := registry.Get("mcp.context7")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if snapshot.Endpoint != "https://mcp.context7.com/v2" {
		t.Fatalf("unexpected updated endpoint: %#v", snapshot)
	}
	if snapshot.State != MCPStateIdle || !snapshot.Active || snapshot.Enabled {
		t.Fatalf("expected lifecycle fields preserved, got %#v", snapshot)
	}
	if !snapshot.LastUsed.Equal(usedAt) {
		t.Fatalf("expected last_used preserved, got %s", snapshot.LastUsed)
	}

	spec, err := registry.Spec("mcp.context7")
	if err != nil {
		t.Fatalf("Spec error: %v", err)
	}
	if spec.Remote == nil || spec.Remote.Headers["Authorization"] != "Bearer new" {
		t.Fatalf("unexpected updated headers: %#v", spec.Remote)
	}
}

func TestMCPRegistryDeleteRemovesServer(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID:   "mcp.context7",
		Type: MCPServerTypeRemote,
		Remote: &MCPRemoteConfig{
			Endpoint: "https://mcp.context7.com/mcp",
		},
	}); err != nil {
		t.Fatalf("Register(remote) error: %v", err)
	}

	if err := registry.Delete("mcp.context7"); err != nil {
		t.Fatalf("Delete error: %v", err)
	}
	if _, err := registry.Get("mcp.context7"); !errors.Is(err, ErrMCPServerNotFound) {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}
