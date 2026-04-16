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
