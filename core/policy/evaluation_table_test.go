package policy

import "testing"

func TestEvaluatePolicySemantics(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		cfg    func() Config
		ctx    Context
		assert func(*testing.T, Decision)
	}{
		{
			name: "ignore deny takes precedence over trusted rule without approval",
			cfg: func() Config {
				cfg := defaultConfig("/workspace/repo")
				cfg.TrustedRules = append(cfg.TrustedRules, TrustedRule{
					ID:          "trusted-tool",
					Scope:       ScopeRepo,
					ScopeRef:    "/workspace/repo",
					SubjectType: SubjectTool,
					MatcherType: MatcherExact,
					Matcher:     "files.read",
					Enabled:     true,
				})
				return cfg
			},
			ctx: Context{
				ToolName:             "files.read",
				RepoRoot:             "/workspace/repo",
				AffectedPaths:        []string{"/workspace/repo/keys/server.pem"},
				RequiredCapabilities: []string{"workspace:read"},
				ChecksIgnoreRules:    true,
				ApprovalTier:         ApprovalTierSafe,
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if decision.Allowed || !decision.RequiresConfirmation || decision.Reason != "ignore_rule_confirmation_required" {
					t.Fatalf("expected ignore rule confirmation, got %#v", decision)
				}
				if decision.MatchedIgnoreRuleID == "" {
					t.Fatalf("expected matched ignore rule, got %#v", decision)
				}
				if decision.MatchedTrustedRuleID != "" {
					t.Fatalf("trusted rule should not win over ignore deny, got %#v", decision)
				}
			},
		},
		{
			name: "dangerous trusted rule auto approves",
			cfg: func() Config {
				cfg := defaultConfig("/workspace/repo")
				cfg.TrustedRules = append(cfg.TrustedRules, TrustedRule{
					ID:          "trusted-tool",
					Scope:       ScopeRepo,
					ScopeRef:    "/workspace/repo",
					SubjectType: SubjectTool,
					MatcherType: MatcherExact,
					Matcher:     "term.send_input",
					Enabled:     true,
				})
				return cfg
			},
			ctx: Context{
				ToolName:             "term.send_input",
				RepoRoot:             "/workspace/repo",
				RequiredCapabilities: []string{"terminal:input"},
				ApprovalTier:         ApprovalTierDangerous,
				Mutating:             true,
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if !decision.Allowed || !decision.AutoApproved || decision.MatchedTrustedRuleID == "" {
					t.Fatalf("expected trusted auto-approval, got %#v", decision)
				}
			},
		},
		{
			name: "allowed roots outside repo require confirmation without approval",
			cfg: func() Config {
				return defaultConfig("/workspace/repo")
			},
			ctx: Context{
				ToolName:             "files.write",
				RepoRoot:             "/workspace/repo",
				AffectedPaths:        []string{"/etc/hosts"},
				RequiredCapabilities: []string{"policy:write"},
				RequiresAllowedRoots: true,
				ApprovalTier:         ApprovalTierModerate,
				Mutating:             true,
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if decision.Allowed || !decision.RequiresConfirmation || decision.Reason != "allowed_root_confirmation_required" {
					t.Fatalf("expected allowed-root confirmation, got %#v", decision)
				}
			},
		},
		{
			name: "allowed roots outside repo pass with approval",
			cfg: func() Config {
				return defaultConfig("/workspace/repo")
			},
			ctx: Context{
				ToolName:             "files.write",
				RepoRoot:             "/workspace/repo",
				AffectedPaths:        []string{"/etc/hosts"},
				RequiredCapabilities: []string{"policy:write"},
				RequiresAllowedRoots: true,
				ApprovalTier:         ApprovalTierModerate,
				Mutating:             true,
				HasApproval:          true,
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if !decision.Allowed || decision.RequiresConfirmation {
					t.Fatalf("expected allowed execution with approval, got %#v", decision)
				}
			},
		},
		{
			name: "mode overlay escalates safe mutation to dangerous confirmation",
			cfg: func() Config {
				return defaultConfig("/workspace/repo")
			},
			ctx: Context{
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
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if decision.EffectiveApprovalTier != ApprovalTierDangerous || decision.Allowed || !decision.RequiresConfirmation {
					t.Fatalf("expected dangerous-tier confirmation, got %#v", decision)
				}
			},
		},
		{
			name: "destructive operations never auto approve via trusted rules",
			cfg: func() Config {
				cfg := defaultConfig("/workspace/repo")
				cfg.TrustedRules = append(cfg.TrustedRules, TrustedRule{
					ID:          "trusted-tool",
					Scope:       ScopeRepo,
					ScopeRef:    "/workspace/repo",
					SubjectType: SubjectTool,
					MatcherType: MatcherExact,
					Matcher:     "policy.destroy",
					Enabled:     true,
				})
				return cfg
			},
			ctx: Context{
				ToolName:             "policy.destroy",
				RepoRoot:             "/workspace/repo",
				RequiredCapabilities: []string{"policy:write"},
				ApprovalTier:         ApprovalTierDestructive,
				Mutating:             true,
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if decision.AutoApproved || decision.Allowed || !decision.RequiresConfirmation {
					t.Fatalf("expected destructive operation to still require confirmation, got %#v", decision)
				}
			},
		},
		{
			name: "role overlay can remove required capability",
			cfg: func() Config {
				return defaultConfig("/workspace/repo")
			},
			ctx: Context{
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
			},
			assert: func(t *testing.T, decision Decision) {
				t.Helper()
				if decision.Allowed || decision.Reason != "capability_denied" {
					t.Fatalf("expected capability denial, got %#v", decision)
				}
				if len(decision.MissingCapabilities) != 1 || decision.MissingCapabilities[0] != "terminal:input" {
					t.Fatalf("unexpected missing capabilities: %#v", decision.MissingCapabilities)
				}
			},
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			decision := Evaluate(test.cfg(), test.ctx)
			test.assert(t, decision)
		})
	}
}
