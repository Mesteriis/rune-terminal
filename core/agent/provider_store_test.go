package agent

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestStorePersistsProvidersAndActiveProvider(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "agent.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	created, _, err := store.CreateProvider(CreateProviderInput{
		Kind:        ProviderKindOpenAI,
		DisplayName: "OpenAI Prod",
		OpenAI: &CreateOpenAIProviderInput{
			BaseURL: defaultOpenAIBaseURL,
			Model:   "gpt-4o-mini",
			APIKey:  "sk-test",
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}
	if err := store.SetActiveProvider(created.ID); err != nil {
		t.Fatalf("SetActiveProvider error: %v", err)
	}

	reloaded, err := NewStore(path)
	if err != nil {
		t.Fatalf("reloaded NewStore error: %v", err)
	}
	active, err := reloaded.ActiveProvider()
	if err != nil {
		t.Fatalf("ActiveProvider error: %v", err)
	}
	if active.ID != created.ID {
		t.Fatalf("expected active provider %q, got %#v", created.ID, active)
	}
	if active.OpenAI == nil || active.OpenAI.APIKeySecret != "sk-test" {
		t.Fatalf("expected persisted openai secret, got %#v", active.OpenAI)
	}
}

func TestProvidersCatalogMasksSecrets(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	created, catalog, err := store.CreateProvider(CreateProviderInput{
		Kind: ProviderKindOpenAI,
		OpenAI: &CreateOpenAIProviderInput{
			BaseURL: defaultOpenAIBaseURL,
			Model:   "gpt-4o-mini",
			APIKey:  "sk-secret",
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}

	var openAIView *ProviderView
	for _, provider := range catalog.Providers {
		if provider.ID == created.ID {
			providerCopy := provider
			openAIView = &providerCopy
			break
		}
	}
	if openAIView == nil || openAIView.OpenAI == nil {
		t.Fatalf("expected openai provider view, got %#v", catalog.Providers)
	}
	if !openAIView.OpenAI.HasAPIKey {
		t.Fatalf("expected has_api_key in %#v", openAIView.OpenAI)
	}

	raw, err := json.Marshal(openAIView)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}
	if string(raw) == "" {
		t.Fatal("expected marshaled provider view")
	}
	if contains := string(raw); strings.Contains(contains, "sk-secret") || strings.Contains(contains, "api_key_secret") {
		t.Fatalf("expected secret to stay masked, got %s", contains)
	}
}

func TestNewStoreMigratesLegacyStateWithoutProviders(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "agent.json")
	legacy := map[string]any{
		"version":           "v1alpha1",
		"active_profile_id": "balanced",
		"active_role_id":    "developer",
		"active_mode_id":    "implement",
		"profiles":          defaultPromptProfiles(),
		"roles":             defaultRoles(),
		"modes":             defaultModes(),
		"updated_at":        "2026-04-21T10:00:00Z",
	}
	raw, err := json.MarshalIndent(legacy, "", "  ")
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}
	if err := os.WriteFile(path, raw, 0o600); err != nil {
		t.Fatalf("WriteFile error: %v", err)
	}

	store, err := NewStore(path)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	active, err := store.ActiveProvider()
	if err != nil {
		t.Fatalf("ActiveProvider error: %v", err)
	}
	if active.Kind != ProviderKindOllama {
		t.Fatalf("expected migrated ollama provider, got %#v", active)
	}
}
