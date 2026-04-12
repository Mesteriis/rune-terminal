package agent

import (
	"time"

	"github.com/avm/rterm/core/policy"
)

func defaultState() State {
	return State{
		Version:         ConfigVersion,
		ActiveProfileID: "balanced",
		ActiveRoleID:    "developer",
		ActiveModeID:    "implement",
		Profiles:        defaultPromptProfiles(),
		Roles:           defaultRoles(),
		Modes:           defaultModes(),
		UpdatedAt:       time.Now().UTC(),
	}
}

func defaultPromptProfiles() []PromptProfile {
	return []PromptProfile{
		{
			ID:           "balanced",
			Name:         "Balanced",
			Description:  "General-purpose desktop agent profile for day-to-day engineering work.",
			SystemPrompt: "Operate inside the workspace boundary. Prefer explicit tool use, keep state changes auditable, and avoid hidden side effects.",
			Overlay: PolicyOverlay{
				SecurityPosture: SecurityBalanced,
			},
		},
		{
			ID:           "hardened",
			Name:         "Hardened",
			Description:  "Security-first profile that assumes least privilege and suppresses silent trust shortcuts.",
			SystemPrompt: "Operate in least-privilege mode. Prefer read paths, require explicit confirmation for mutations, and do not rely on ambient trust.",
			Overlay: PolicyOverlay{
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityHardened,
			},
		},
		{
			ID:           "ops-control",
			Name:         "Ops Control",
			Description:  "Operational profile for service control and incident handling under audit.",
			SystemPrompt: "Prioritize service recovery, change visibility, and operator traceability. Keep a tight audit trail for live interventions.",
			Overlay: PolicyOverlay{
				SecurityPosture: SecurityOperations,
			},
		},
		{
			ID:           "review-strict",
			Name:         "Review Strict",
			Description:  "Read-heavy profile for architectural review and validation passes.",
			SystemPrompt: "Bias toward analysis, validation, and critique. Mutations should be exceptional and always deliberate.",
			Overlay: PolicyOverlay{
				CapabilityRemovals:        []string{"terminal:input", "policy:write"},
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityRestricted,
			},
		},
	}
}

func defaultRoles() []RolePreset {
	return []RolePreset{
		{
			ID:          "developer",
			Name:        "Developer",
			Description: "Feature implementation and local workflow iteration.",
			Prompt:      "Optimize for implementation throughput, but keep module boundaries and tests intact.",
			Overlay:     PolicyOverlay{SecurityPosture: SecurityBalanced},
		},
		{
			ID:          "devops",
			Name:        "DevOps",
			Description: "Build, deploy, and runtime automation work.",
			Prompt:      "Prefer repeatable operational flows, infrastructure hygiene, and release-safe execution.",
			Overlay:     PolicyOverlay{SecurityPosture: SecurityOperations},
		},
		{
			ID:          "sre",
			Name:        "SRE",
			Description: "Reliability-focused triage, debugging, and recovery.",
			Prompt:      "Favor observability, blast-radius control, and reversible interventions.",
			Overlay:     PolicyOverlay{SecurityPosture: SecurityOperations},
		},
		{
			ID:          "secops",
			Name:        "SecOps",
			Description: "Security operations with least-privilege defaults.",
			Prompt:      "Prioritize containment, evidence preservation, and stricter approval posture over speed.",
			Overlay: PolicyOverlay{
				CapabilityRemovals:        []string{"terminal:input"},
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityHardened,
			},
		},
		{
			ID:          "architect",
			Name:        "Architect",
			Description: "System design and boundary review.",
			Prompt:      "Bias toward design clarity, boundary hygiene, and explicit trade-offs instead of quick mutations.",
			Overlay: PolicyOverlay{
				CapabilityRemovals: []string{"terminal:input", "policy:write"},
				SecurityPosture:    SecurityRestricted,
			},
		},
		{
			ID:          "reviewer",
			Name:        "Reviewer",
			Description: "Code review, validation, and regression spotting.",
			Prompt:      "Focus on correctness, risk, regressions, and test gaps. Treat mutations as exceptions.",
			Overlay: PolicyOverlay{
				CapabilityRemovals:        []string{"terminal:input", "policy:write"},
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityRestricted,
			},
		},
		{
			ID:          "release-manager",
			Name:        "Release Manager",
			Description: "Release preparation, validation, and controlled rollout management.",
			Prompt:      "Optimize for release correctness, auditability, and rollback readiness.",
			Overlay: PolicyOverlay{
				CapabilityRemovals: []string{"terminal:input"},
				SecurityPosture:    SecurityRelease,
			},
		},
	}
}

func defaultModes() []WorkMode {
	return []WorkMode{
		{
			ID:          "explore",
			Name:        "Explore",
			Description: "Read-only discovery and model building.",
			Prompt:      "Prefer inspection, summarization, and architectural understanding. Avoid mutations unless explicitly promoted to another mode.",
			Overlay: PolicyOverlay{
				CapabilityRemovals: []string{"terminal:input", "policy:write"},
				SecurityPosture:    SecurityRestricted,
			},
		},
		{
			ID:          "implement",
			Name:        "Implement",
			Description: "Normal feature implementation mode.",
			Prompt:      "Execute the requested implementation directly, but keep the architecture modular and testable.",
			Overlay:     PolicyOverlay{SecurityPosture: SecurityBalanced},
		},
		{
			ID:          "review",
			Name:        "Review",
			Description: "Mutation-averse review and verification mode.",
			Prompt:      "Stay read-heavy, evaluate risks first, and gate any mutation behind explicit intent.",
			Overlay: PolicyOverlay{
				CapabilityRemovals:        []string{"terminal:input", "policy:write"},
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityRestricted,
			},
		},
		{
			ID:          "debug",
			Name:        "Debug",
			Description: "Interactive debugging with constrained mutation.",
			Prompt:      "Use terminal and runtime probes deliberately, keeping changes tightly scoped to debugging needs.",
			Overlay: PolicyOverlay{
				MinimumMutationTier: policy.ApprovalTierModerate,
				SecurityPosture:     SecurityBalanced,
			},
		},
		{
			ID:          "ops",
			Name:        "Ops",
			Description: "Operational maintenance and service control.",
			Prompt:      "Prefer operational determinism, explicit service state checks, and auditable changes.",
			Overlay:     PolicyOverlay{SecurityPosture: SecurityOperations},
		},
		{
			ID:          "incident",
			Name:        "Incident",
			Description: "Live incident response with elevated caution.",
			Prompt:      "Optimize for containment and service recovery while preserving evidence and minimizing collateral impact.",
			Overlay: PolicyOverlay{
				MinimumMutationTier: policy.ApprovalTierModerate,
				SecurityPosture:     SecurityOperations,
			},
		},
		{
			ID:          "secure",
			Name:        "Secure",
			Description: "Hardened mode for security-sensitive work.",
			Prompt:      "Act in hardened mode. Favor inspection, stricter approvals, and explicit trust boundaries.",
			Overlay: PolicyOverlay{
				CapabilityRemovals:        []string{"terminal:input"},
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityHardened,
			},
		},
		{
			ID:          "release",
			Name:        "Release",
			Description: "Controlled release execution and verification mode.",
			Prompt:      "Treat changes as release-scoped, auditable operations with rollback awareness and no casual terminal drift.",
			Overlay: PolicyOverlay{
				CapabilityRemovals:        []string{"terminal:input"},
				MinimumMutationTier:       policy.ApprovalTierDangerous,
				DisableTrustedAutoApprove: true,
				SecurityPosture:           SecurityRelease,
			},
		},
	}
}
