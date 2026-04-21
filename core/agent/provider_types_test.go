package agent

import (
	"slices"
	"testing"
)

func TestSupportedProviderKindsIncludeOllamaOpenAIAndProxy(t *testing.T) {
	t.Parallel()

	kinds := SupportedProviderKinds()
	if !slices.Contains(kinds, ProviderKindOllama) {
		t.Fatalf("expected ollama support, got %#v", kinds)
	}
	if !slices.Contains(kinds, ProviderKindOpenAI) {
		t.Fatalf("expected openai support, got %#v", kinds)
	}
	if !slices.Contains(kinds, ProviderKindProxy) {
		t.Fatalf("expected proxy support, got %#v", kinds)
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
	if provider.Kind != ProviderKindOllama {
		t.Fatalf("expected default ollama provider, got %#v", provider)
	}
}
