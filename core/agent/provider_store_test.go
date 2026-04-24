package agent

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
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
		Kind:        ProviderKindClaude,
		DisplayName: "Claude Work",
		Claude: &CreateClaudeProviderInput{
			Command:    "claude",
			Model:      "opus",
			ChatModels: []string{"sonnet", "opus"},
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
	if active.Claude == nil || active.Claude.Model != "opus" {
		t.Fatalf("expected persisted claude provider, got %#v", active.Claude)
	}
}

func TestProvidersCatalogIncludesCLIStatus(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	created, catalog, err := store.CreateProvider(CreateProviderInput{
		Kind: ProviderKindCodex,
		Codex: &CreateCodexProviderInput{
			Command:    "definitely-missing-rterm-codex",
			Model:      defaultCodexModel,
			ChatModels: []string{"gpt-5-codex"},
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}

	var codexView *ProviderView
	for _, provider := range catalog.Providers {
		if provider.ID == created.ID {
			providerCopy := provider
			codexView = &providerCopy
			break
		}
	}
	if codexView == nil || codexView.Codex == nil {
		t.Fatalf("expected codex provider view, got %#v", catalog.Providers)
	}
	if codexView.Codex.StatusState != "missing" {
		t.Fatalf("unexpected codex provider view: %#v", codexView.Codex)
	}
	if !slices.Equal(codexView.Codex.ChatModels, []string{"gpt-5.4", "gpt-5-codex"}) {
		t.Fatalf("unexpected chat models: %#v", codexView.Codex.ChatModels)
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
	if active.Kind != ProviderKindCodex {
		t.Fatalf("expected migrated codex provider, got %#v", active)
	}
}

func TestNewStoreDropsLegacyUnsupportedProviders(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "agent.json")
	now := "2026-04-21T10:00:00Z"
	legacy := map[string]any{
		"version":            ConfigVersion,
		"active_profile_id":  "balanced",
		"active_role_id":     "developer",
		"active_mode_id":     "implement",
		"active_provider_id": "ollama-local",
		"profiles":           defaultPromptProfiles(),
		"roles":              defaultRoles(),
		"modes":              defaultModes(),
		"providers": []map[string]any{
			{
				"id":           "ollama-local",
				"kind":         "ollama",
				"display_name": "Local Ollama",
				"enabled":      true,
				"ollama": map[string]any{
					"base_url": "http://127.0.0.1:11434",
				},
				"created_at": now,
				"updated_at": now,
			},
		},
		"updated_at": now,
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
	catalog := store.ProvidersCatalog()
	if len(catalog.Providers) != 2 {
		t.Fatalf("expected default cli providers after migration, got %#v", catalog.Providers)
	}
	if catalog.ActiveProviderID != defaultActiveProviderID() {
		t.Fatalf("expected default active provider, got %#v", catalog)
	}
}

func TestCreateProviderRejectsUnsupportedLegacyKind(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	_, _, err = store.CreateProvider(CreateProviderInput{
		Kind: ProviderKind("ollama"),
	})
	if err == nil {
		t.Fatal("expected unsupported provider kind error")
	}
}

func TestStorePersistsOpenAICompatibleProvider(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "agent.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	created, _, err := store.CreateProvider(CreateProviderInput{
		Kind:        ProviderKindOpenAICompatible,
		DisplayName: "LAN Gateway",
		OpenAICompatible: &CreateOpenAICompatibleProviderInput{
			BaseURL:    "http://192.168.1.8:8317/",
			Model:      "gemini-3-pro-high",
			ChatModels: []string{"gpt-5.4"},
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}

	if created.OpenAICompatible == nil {
		t.Fatalf("expected openai-compatible settings, got %#v", created)
	}
	if created.OpenAICompatible.BaseURL != "http://192.168.1.8:8317" {
		t.Fatalf("expected normalized base URL, got %#v", created.OpenAICompatible)
	}
	if !slices.Equal(
		created.OpenAICompatible.ChatModels,
		[]string{"gemini-3-pro-high", "gpt-5.4"},
	) {
		t.Fatalf("unexpected chat models: %#v", created.OpenAICompatible.ChatModels)
	}
}
