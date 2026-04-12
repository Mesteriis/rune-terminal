package policy

import (
	"path/filepath"
	"testing"
)

func TestDefaultIgnoreRulesUseStricterSecretModes(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	cfg := store.Snapshot()

	assertMode := func(pattern string, mode IgnoreMode) {
		t.Helper()
		for _, rule := range cfg.IgnoreRules {
			if rule.Pattern == pattern {
				if rule.Mode != mode {
					t.Fatalf("expected %s mode %s, got %s", pattern, mode, rule.Mode)
				}
				return
			}
		}
		t.Fatalf("pattern %s not found", pattern)
	}

	assertMode(".env", IgnoreModeMetadataOnly)
	assertMode(".env.*", IgnoreModeMetadataOnly)
	assertMode("secrets.*", IgnoreModeMetadataOnly)
	assertMode("*.pem", IgnoreModeDeny)
	assertMode("*.key", IgnoreModeDeny)
	assertMode("*.p12", IgnoreModeDeny)
	assertMode("id_rsa", IgnoreModeDeny)
	assertMode("id_ed25519", IgnoreModeDeny)
}

func TestTrustedRuleLifecycle(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	rule, err := store.AddTrustedRule(TrustedRule{
		Scope:       ScopeRepo,
		ScopeRef:    "/workspace/repo",
		SubjectType: SubjectTool,
		MatcherType: MatcherExact,
		Matcher:     "term.send_input",
		Enabled:     true,
	})
	if err != nil {
		t.Fatalf("AddTrustedRule error: %v", err)
	}

	if len(store.ListTrustedRules()) != 1 {
		t.Fatalf("expected one trusted rule")
	}

	removed, err := store.RemoveTrustedRule(rule.ID)
	if err != nil {
		t.Fatalf("RemoveTrustedRule error: %v", err)
	}
	if !removed {
		t.Fatalf("expected trusted rule removal")
	}
}

func TestIgnoreRuleLifecycle(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	rule, err := store.AddIgnoreRule(IgnoreRule{
		Scope:       ScopeRepo,
		ScopeRef:    "/workspace/repo",
		MatcherType: MatcherGlob,
		Pattern:     "tmp-secret-*",
		Mode:        IgnoreModeMetadataOnly,
		Enabled:     true,
	})
	if err != nil {
		t.Fatalf("AddIgnoreRule error: %v", err)
	}

	if len(store.ListIgnoreRules()) != len(defaultIgnoreRules())+1 {
		t.Fatalf("expected custom ignore rule to be appended")
	}

	removed, err := store.RemoveIgnoreRule(rule.ID)
	if err != nil {
		t.Fatalf("RemoveIgnoreRule error: %v", err)
	}
	if !removed {
		t.Fatalf("expected ignore rule removal")
	}
}
