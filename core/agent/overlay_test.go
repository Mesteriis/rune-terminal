package agent

import (
	"testing"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

func TestSelectionMapsToPolicyProfile(t *testing.T) {
	t.Parallel()

	selection := Selection{
		Profile: PromptProfile{ID: "balanced", Overlay: PolicyOverlay{SecurityPosture: SecurityBalanced}},
		Role: RolePreset{
			ID: "reviewer",
			Overlay: PolicyOverlay{
				CapabilityRemovals: []string{"terminal:input"},
				SecurityPosture:    SecurityRestricted,
			},
		},
		Mode: WorkMode{
			ID: "review",
			Overlay: PolicyOverlay{
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityHardened,
			},
		},
	}

	profile := selection.EffectivePolicyProfile()
	if profile.RoleID != "reviewer" || profile.ModeID != "review" {
		t.Fatalf("unexpected role/mode mapping: %#v", profile)
	}
	if profile.SecurityPosture != string(SecurityHardened) {
		t.Fatalf("expected hardened posture, got %s", profile.SecurityPosture)
	}
	if profile.ApprovalOverlay.MinimumMutationTier != policy.ApprovalTierDangerous {
		t.Fatalf("expected dangerous mutation tier, got %s", profile.ApprovalOverlay.MinimumMutationTier)
	}
	if !profile.DisableTrustedAutoApprove {
		t.Fatalf("expected trusted auto-approve to be disabled")
	}
	if len(profile.CapabilityOverlay.Removals) != 1 || profile.CapabilityOverlay.Removals[0] != "terminal:input" {
		t.Fatalf("unexpected capability removals: %#v", profile.CapabilityOverlay.Removals)
	}
}
