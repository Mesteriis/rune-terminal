package agent

import (
	"path/filepath"
	"testing"
)

func TestStorePersistsSelection(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "agent.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	if err := store.SetActiveProfile("hardened"); err != nil {
		t.Fatalf("SetActiveProfile error: %v", err)
	}
	if err := store.SetActiveRole("secops"); err != nil {
		t.Fatalf("SetActiveRole error: %v", err)
	}
	if err := store.SetActiveMode("secure"); err != nil {
		t.Fatalf("SetActiveMode error: %v", err)
	}

	reloaded, err := NewStore(path)
	if err != nil {
		t.Fatalf("reloaded NewStore error: %v", err)
	}
	selection, err := reloaded.Selection()
	if err != nil {
		t.Fatalf("Selection error: %v", err)
	}
	if selection.Profile.ID != "hardened" || selection.Role.ID != "secops" || selection.Mode.ID != "secure" {
		t.Fatalf("unexpected persisted selection: %#v", selection)
	}
}

func TestBuiltinsContainRequiredRolesAndModes(t *testing.T) {
	t.Parallel()

	state := defaultState()
	requiredRoles := []string{"developer", "devops", "sre", "secops", "architect", "reviewer", "release-manager"}
	for _, roleID := range requiredRoles {
		if _, ok := findByID(state.Roles, roleID); !ok {
			t.Fatalf("role %s not found", roleID)
		}
	}
	requiredModes := []string{"explore", "implement", "review", "debug", "ops", "incident", "secure", "release"}
	for _, modeID := range requiredModes {
		if _, ok := findByID(state.Modes, modeID); !ok {
			t.Fatalf("mode %s not found", modeID)
		}
	}
}
