package agent

import (
	"strings"
	"time"

	"github.com/avm/rterm/core/policy"
)

const ConfigVersion = "v1alpha1"

type SecurityPosture string

const (
	SecurityBalanced   SecurityPosture = "balanced"
	SecurityRestricted SecurityPosture = "restricted"
	SecurityHardened   SecurityPosture = "hardened"
	SecurityOperations SecurityPosture = "operations"
	SecurityRelease    SecurityPosture = "release"
)

type PolicyOverlay struct {
	CapabilityAdditions       []string            `json:"capability_additions,omitempty"`
	CapabilityRemovals        []string            `json:"capability_removals,omitempty"`
	MinimumMutationTier       policy.ApprovalTier `json:"minimum_mutation_tier,omitempty"`
	EscalateApprovalBy        int                 `json:"escalate_approval_by,omitempty"`
	DisableTrustedAutoApprove bool                `json:"disable_trusted_auto_approve,omitempty"`
	SecurityPosture           SecurityPosture     `json:"security_posture,omitempty"`
}

type PromptProfile struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	SystemPrompt string        `json:"system_prompt"`
	Overlay      PolicyOverlay `json:"overlay"`
}

type RolePreset struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Prompt      string        `json:"prompt"`
	Overlay     PolicyOverlay `json:"overlay"`
}

type WorkMode struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Prompt      string        `json:"prompt"`
	Overlay     PolicyOverlay `json:"overlay"`
}

type State struct {
	Version         string          `json:"version"`
	ActiveProfileID string          `json:"active_profile_id"`
	ActiveRoleID    string          `json:"active_role_id"`
	ActiveModeID    string          `json:"active_mode_id"`
	Profiles        []PromptProfile `json:"profiles"`
	Roles           []RolePreset    `json:"roles"`
	Modes           []WorkMode      `json:"modes"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type Selection struct {
	Profile PromptProfile `json:"profile"`
	Role    RolePreset    `json:"role"`
	Mode    WorkMode      `json:"mode"`
}

func (s Selection) EffectivePrompt() string {
	parts := []string{
		strings.TrimSpace(s.Profile.SystemPrompt),
		strings.TrimSpace(s.Role.Prompt),
		strings.TrimSpace(s.Mode.Prompt),
	}
	var compact []string
	for _, part := range parts {
		if part != "" {
			compact = append(compact, part)
		}
	}
	return strings.Join(compact, "\n\n")
}

func (s Selection) EffectivePolicyProfile() policy.EvaluationProfile {
	overlay := mergeOverlays(s.Profile.Overlay, s.Role.Overlay, s.Mode.Overlay)
	return policy.EvaluationProfile{
		PromptProfileID: s.Profile.ID,
		RoleID:          s.Role.ID,
		ModeID:          s.Mode.ID,
		SecurityPosture: string(overlay.SecurityPosture),
		CapabilityOverlay: policy.CapabilityOverlay{
			Additions: append([]string(nil), overlay.CapabilityAdditions...),
			Removals:  append([]string(nil), overlay.CapabilityRemovals...),
		},
		ApprovalOverlay: policy.ApprovalOverlay{
			EscalateBy:          overlay.EscalateApprovalBy,
			MinimumMutationTier: overlay.MinimumMutationTier,
		},
		DisableTrustedAutoApprove: overlay.DisableTrustedAutoApprove,
	}
}

func mergeOverlays(overlays ...PolicyOverlay) PolicyOverlay {
	merged := PolicyOverlay{}
	for _, overlay := range overlays {
		merged.CapabilityAdditions = append(merged.CapabilityAdditions, overlay.CapabilityAdditions...)
		merged.CapabilityRemovals = append(merged.CapabilityRemovals, overlay.CapabilityRemovals...)
		if overlay.MinimumMutationTier != "" {
			merged.MinimumMutationTier = maxApprovalTier(merged.MinimumMutationTier, overlay.MinimumMutationTier)
		}
		if overlay.EscalateApprovalBy > merged.EscalateApprovalBy {
			merged.EscalateApprovalBy = overlay.EscalateApprovalBy
		}
		if overlay.DisableTrustedAutoApprove {
			merged.DisableTrustedAutoApprove = true
		}
		if overlay.SecurityPosture != "" {
			merged.SecurityPosture = overlay.SecurityPosture
		}
	}
	if merged.SecurityPosture == "" {
		merged.SecurityPosture = SecurityBalanced
	}
	return merged
}

func maxApprovalTier(current policy.ApprovalTier, next policy.ApprovalTier) policy.ApprovalTier {
	if approvalRank(next) > approvalRank(current) {
		return next
	}
	return current
}

func approvalRank(tier policy.ApprovalTier) int {
	switch tier {
	case policy.ApprovalTierModerate:
		return 1
	case policy.ApprovalTierDangerous:
		return 2
	case policy.ApprovalTierDestructive:
		return 3
	default:
		return 0
	}
}
