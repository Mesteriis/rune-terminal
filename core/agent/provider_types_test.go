package agent

import (
	"slices"
	"testing"
)

func TestSupportedProviderKindsIncludeSupportedProviders(t *testing.T) {
	t.Parallel()

	kinds := SupportedProviderKinds()
	if !slices.Contains(kinds, ProviderKindCodex) {
		t.Fatalf("expected codex support, got %#v", kinds)
	}
	if !slices.Contains(kinds, ProviderKindClaude) {
		t.Fatalf("expected claude support, got %#v", kinds)
	}
	if !slices.Contains(kinds, ProviderKindOpenAICompatible) {
		t.Fatalf("expected openai-compatible support, got %#v", kinds)
	}
	if len(kinds) != 3 {
		t.Fatalf("expected three supported providers, got %#v", kinds)
	}
}

func TestDefaultStateIncludesActiveProvider(t *testing.T) {
	t.Parallel()

	state := defaultState()
	if state.ActiveProviderID == "" {
		t.Fatal("expected active provider id")
	}
	provider, ok := findByID(state.Providers, state.ActiveProviderID)
	if !ok {
		t.Fatalf("expected active provider %q in %#v", state.ActiveProviderID, state.Providers)
	}
	if provider.Kind != ProviderKindCodex {
		t.Fatalf("expected default codex provider, got %#v", provider)
	}
	if _, ok := findByID(state.Providers, "claude-code-cli"); !ok {
		t.Fatalf("expected default claude provider in %#v", state.Providers)
	}
}
