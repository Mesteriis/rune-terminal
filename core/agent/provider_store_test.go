package agent

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/aiproxy"
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

func TestProvidersCatalogIncludesCodexAuthStatusWithoutSecrets(t *testing.T) {
	t.Parallel()

	authPath := filepath.Join(t.TempDir(), "auth.json")
	if err := os.WriteFile(authPath, []byte(`{
  "auth_mode": "chatgpt",
  "tokens": {
    "access_token": "access-token",
    "account_id": "acct_123"
  }
}`), 0o600); err != nil {
		t.Fatalf("WriteFile error: %v", err)
	}

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	created, catalog, err := store.CreateProvider(CreateProviderInput{
		Kind: ProviderKindCodex,
		Codex: &CreateCodexProviderInput{
			Model:        defaultCodexModel,
			AuthFilePath: authPath,
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
	if codexView.Codex.AuthState != "ready" || codexView.Codex.AuthMode != "chatgpt" {
		t.Fatalf("unexpected codex provider view: %#v", codexView.Codex)
	}

	raw, err := json.Marshal(codexView)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}
	if contains := string(raw); strings.Contains(contains, "access-token") {
		t.Fatalf("expected codex auth state to stay masked, got %s", contains)
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

func TestProvidersCatalogMasksProxyAPIKeys(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	created, catalog, err := store.CreateProvider(CreateProviderInput{
		Kind: ProviderKindProxy,
		Proxy: &CreateProxyProviderInput{
			Model: "assistant-default",
			Channels: []aiproxy.Channel{{
				ID:          "codex-primary",
				Name:        "Codex",
				ServiceType: aiproxy.ServiceTypeOpenAI,
				BaseURL:     "https://example.com/v1",
				APIKeys: []aiproxy.APIKey{{
					Key:     "sk-proxy-secret",
					Enabled: true,
				}},
			}},
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}

	var proxyView *ProviderView
	for _, provider := range catalog.Providers {
		if provider.ID == created.ID {
			providerCopy := provider
			proxyView = &providerCopy
			break
		}
	}
	if proxyView == nil || proxyView.Proxy == nil {
		t.Fatalf("expected proxy provider view, got %#v", catalog.Providers)
	}
	if len(proxyView.Proxy.Channels) != 1 {
		t.Fatalf("unexpected proxy channels: %#v", proxyView.Proxy.Channels)
	}
	if proxyView.Proxy.Channels[0].EnabledKeyCount != 1 {
		t.Fatalf("expected enabled key count, got %#v", proxyView.Proxy.Channels[0])
	}

	raw, err := json.Marshal(proxyView)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}
	if contains := string(raw); strings.Contains(contains, "sk-proxy-secret") || strings.Contains(contains, "\"key\"") {
		t.Fatalf("expected proxy secrets to stay masked, got %s", contains)
	}
}

func TestUpdateProxyProviderPreservesExistingChannelSecretsWhenKeysOmitted(t *testing.T) {
	t.Parallel()

	store, err := NewStore(filepath.Join(t.TempDir(), "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	created, _, err := store.CreateProvider(CreateProviderInput{
		Kind: ProviderKindProxy,
		Proxy: &CreateProxyProviderInput{
			Model: "assistant-default",
			Channels: []aiproxy.Channel{{
				ID:          "codex-primary",
				Name:        "Codex",
				ServiceType: aiproxy.ServiceTypeOpenAI,
				BaseURL:     "https://example.com/v1",
				APIKeys: []aiproxy.APIKey{{
					Key:     "sk-proxy-secret",
					Enabled: true,
				}},
			}},
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}
	if err := store.SetActiveProvider(created.ID); err != nil {
		t.Fatalf("SetActiveProvider error: %v", err)
	}

	updated, _, err := store.UpdateProvider(created.ID, UpdateProviderInput{
		Proxy: &UpdateProxyProviderInput{
			Channels: &[]UpdateProxyChannelInput{{
				Channel: aiproxy.Channel{
					ID:          "codex-primary",
					Name:        "Codex EU",
					ServiceType: aiproxy.ServiceTypeOpenAI,
					BaseURL:     "https://example.eu/v1",
				},
			}},
			ReplaceChannels: true,
		},
	})
	if err != nil {
		t.Fatalf("UpdateProvider error: %v", err)
	}
	if updated.Proxy == nil || len(updated.Proxy.Channels) != 1 {
		t.Fatalf("expected proxy view after update, got %#v", updated)
	}
	if updated.Proxy.Channels[0].EnabledKeyCount != 1 {
		t.Fatalf("expected preserved enabled key count, got %#v", updated.Proxy.Channels[0])
	}
	if updated.Proxy.Channels[0].Name != "Codex EU" || updated.Proxy.Channels[0].BaseURL != "https://example.eu/v1" {
		t.Fatalf("expected updated channel metadata, got %#v", updated.Proxy.Channels[0])
	}

	active, err := store.ActiveProvider()
	if err != nil {
		t.Fatalf("ActiveProvider error: %v", err)
	}
	if active.Proxy == nil || len(active.Proxy.Channels) != 1 {
		t.Fatalf("expected active proxy provider, got %#v", active)
	}
	if len(active.Proxy.Channels[0].APIKeys) != 1 || active.Proxy.Channels[0].APIKeys[0].Key != "sk-proxy-secret" {
		t.Fatalf("expected preserved proxy secret, got %#v", active.Proxy.Channels[0].APIKeys)
	}
}
