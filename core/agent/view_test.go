package agent

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestSelectionViewPreservesPromptOrder(t *testing.T) {
	t.Parallel()

	selection := Selection{
		Profile: PromptProfile{ID: "balanced", SystemPrompt: "profile"},
		Role:    RolePreset{ID: "developer", Prompt: "role"},
		Mode:    WorkMode{ID: "implement", Prompt: "mode"},
	}

	view := selection.View()
	if view.EffectivePrompt != "profile\n\nrole\n\nmode" {
		t.Fatalf("unexpected effective prompt: %q", view.EffectivePrompt)
	}
}

func TestCatalogReturnsActiveSelectionAndEffectivePosture(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
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

	catalog, err := store.Catalog()
	if err != nil {
		t.Fatalf("Catalog error: %v", err)
	}
	if catalog.Active.Profile.ID != "hardened" || catalog.Active.Role.ID != "secops" || catalog.Active.Mode.ID != "secure" {
		t.Fatalf("unexpected active selection: %#v", catalog.Active)
	}
	if !catalog.Active.EffectivePolicyProfile.DisableTrustedAutoApprove {
		t.Fatalf("expected trusted auto-approve to be disabled")
	}
	if !strings.Contains(catalog.Active.EffectivePrompt, "least-privilege") {
		t.Fatalf("expected profile baseline in effective prompt, got %q", catalog.Active.EffectivePrompt)
	}
}
