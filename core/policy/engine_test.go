package policy

import "testing"

func TestDangerousActionRequiresConfirmationWithoutTrustedRule(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	decision := Evaluate(cfg, Context{
		ToolName:             "safety.add_ignore_rule",
		WorkspaceID:          "ws-local",
		RepoRoot:             "/workspace/repo",
		RequiredCapabilities: []string{"policy:write"},
		ApprovalTier:         ApprovalTierDangerous,
		Mutating:             true,
	})
	if decision.Allowed || !decision.RequiresConfirmation {
		t.Fatalf("expected confirmation requirement, got %#v", decision)
	}
}

func TestTrustedRuleAutoApprovesDangerousTool(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	cfg.TrustedRules = append(cfg.TrustedRules, TrustedRule{
		ID:          "trusted-1",
		Scope:       ScopeRepo,
		ScopeRef:    "/workspace/repo",
		SubjectType: SubjectTool,
		MatcherType: MatcherExact,
		Matcher:     "safety.add_ignore_rule",
		Enabled:     true,
	})

	decision := Evaluate(cfg, Context{
		ToolName:             "safety.add_ignore_rule",
		RepoRoot:             "/workspace/repo",
		RequiredCapabilities: []string{"policy:write"},
		ApprovalTier:         ApprovalTierDangerous,
		Mutating:             true,
	})
	if !decision.Allowed || !decision.AutoApproved || decision.MatchedTrustedRuleID == "" {
		t.Fatalf("expected auto-approved decision, got %#v", decision)
	}
}

func TestIgnoreRuleMetadataOnlyDoesNotBlock(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	decision := Evaluate(cfg, Context{
		ToolName:             "files.read",
		RepoRoot:             "/workspace/repo",
		AffectedPaths:        []string{"/workspace/repo/.env"},
		RequiredCapabilities: []string{"workspace:read"},
		ChecksIgnoreRules:    true,
		ApprovalTier:         ApprovalTierSafe,
	})
	if !decision.Allowed || decision.MatchedIgnoreRuleID == "" || decision.IgnoreMode != IgnoreModeMetadataOnly {
		t.Fatalf("expected metadata-only allow, got %#v", decision)
	}
}

func TestIgnoreRuleDenyRequiresConfirmationForPrivateKey(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	decision := Evaluate(cfg, Context{
		ToolName:             "files.read",
		RepoRoot:             "/workspace/repo",
		AffectedPaths:        []string{"/workspace/repo/keys/id_rsa"},
		RequiredCapabilities: []string{"workspace:read"},
		ChecksIgnoreRules:    true,
		ApprovalTier:         ApprovalTierSafe,
	})
	if decision.Allowed || !decision.RequiresConfirmation || decision.IgnoreMode != IgnoreModeDeny {
		t.Fatalf("expected deny rule confirmation, got %#v", decision)
	}
}

func TestAllowedRootsRequireConfirmationOutsideRepo(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	decision := Evaluate(cfg, Context{
		ToolName:             "files.write",
		RepoRoot:             "/workspace/repo",
		AffectedPaths:        []string{"/etc/hosts"},
		RequiredCapabilities: []string{"policy:write"},
		RequiresAllowedRoots: true,
		ApprovalTier:         ApprovalTierModerate,
	})
	if decision.Allowed || !decision.RequiresConfirmation {
		t.Fatalf("expected confirmation for path outside allowed roots, got %#v", decision)
	}
}

func TestCapabilityOverlayCanRemoveCapabilities(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	decision := Evaluate(cfg, Context{
		ToolName:             "term.send_input",
		RepoRoot:             "/workspace/repo",
		RequiredCapabilities: []string{"terminal:input"},
		ApprovalTier:         ApprovalTierModerate,
		Mutating:             true,
		EvaluationProfile: EvaluationProfile{
			RoleID: "reviewer",
			CapabilityOverlay: CapabilityOverlay{
				Removals: []string{"terminal:input"},
			},
		},
	})
	if decision.Allowed || len(decision.MissingCapabilities) != 1 || decision.MissingCapabilities[0] != "terminal:input" {
		t.Fatalf("expected capability removal to deny execution, got %#v", decision)
	}
}

func TestApprovalOverlayEscalatesMutatingTool(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	decision := Evaluate(cfg, Context{
		ToolName:             "workspace.focus_widget",
		RepoRoot:             "/workspace/repo",
		RequiredCapabilities: []string{"widget:focus"},
		ApprovalTier:         ApprovalTierSafe,
		Mutating:             true,
		EvaluationProfile: EvaluationProfile{
			ModeID: "secure",
			ApprovalOverlay: ApprovalOverlay{
				MinimumMutationTier: ApprovalTierDangerous,
			},
		},
	})
	if decision.EffectiveApprovalTier != ApprovalTierDangerous || decision.Allowed || !decision.RequiresConfirmation {
		t.Fatalf("expected escalated approval requirement, got %#v", decision)
	}
}

func TestTrustedRuleAutoApproveCanBeDisabledByProfile(t *testing.T) {
	t.Parallel()

	cfg := defaultConfig("/workspace/repo")
	cfg.TrustedRules = append(cfg.TrustedRules, TrustedRule{
		ID:          "trusted-1",
		Scope:       ScopeRepo,
		ScopeRef:    "/workspace/repo",
		SubjectType: SubjectTool,
		MatcherType: MatcherExact,
		Matcher:     "safety.add_ignore_rule",
		Enabled:     true,
	})

	decision := Evaluate(cfg, Context{
		ToolName:             "safety.add_ignore_rule",
		RepoRoot:             "/workspace/repo",
		RequiredCapabilities: []string{"policy:write"},
		ApprovalTier:         ApprovalTierDangerous,
		Mutating:             true,
		EvaluationProfile: EvaluationProfile{
			RoleID:                    "secops",
			DisableTrustedAutoApprove: true,
			SecurityPosture:           "hardened",
		},
	})
	if decision.AutoApproved || decision.Allowed || !decision.RequiresConfirmation {
		t.Fatalf("expected trusted auto-approve to be disabled, got %#v", decision)
	}
}
