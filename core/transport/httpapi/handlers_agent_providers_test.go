package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
)

func TestProviderCatalogReturnsBootstrapProvider(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent/providers", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload struct {
		ActiveProviderID string `json:"active_provider_id"`
		Providers        []struct {
			ID     string `json:"id"`
			Kind   string `json:"kind"`
			Active bool   `json:"active"`
		} `json:"providers"`
		SupportedKinds []string `json:"supported_kinds"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.ActiveProviderID == "" {
		t.Fatal("expected active provider id")
	}
	if len(payload.Providers) == 0 || payload.Providers[0].Kind != "ollama" {
		t.Fatalf("expected bootstrap ollama provider, got %#v", payload.Providers)
	}
	if len(payload.SupportedKinds) < 2 {
		t.Fatalf("expected supported kinds, got %#v", payload.SupportedKinds)
	}
}

func TestCreateProviderPersistsMaskedOpenAIConfig(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind":         "openai",
		"display_name": "OpenAI Test",
		"openai": map[string]any{
			"base_url": "https://api.openai.com/v1",
			"model":    "gpt-4o-mini",
			"api_key":  "sk-provider-test",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "sk-provider-test") {
		t.Fatalf("expected secret to stay masked, got %s", recorder.Body.String())
	}

	var payload struct {
		Provider struct {
			ID     string `json:"id"`
			Kind   string `json:"kind"`
			OpenAI struct {
				HasAPIKey bool `json:"has_api_key"`
			} `json:"openai"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Provider.ID == "" || payload.Provider.Kind != "openai" || !payload.Provider.OpenAI.HasAPIKey {
		t.Fatalf("unexpected provider payload: %#v", payload.Provider)
	}
}

func TestUpdateProviderUpdatesPersistedConfig(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "openai",
		"openai": map[string]any{
			"base_url": "https://api.openai.com/v1",
			"model":    "gpt-4o-mini",
			"api_key":  "sk-provider-test",
		},
	}))
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("create expected 200, got %d body=%s", createRecorder.Code, createRecorder.Body.String())
	}
	var created struct {
		Provider struct {
			ID string `json:"id"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create: %v", err)
	}

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPatch, "/api/v1/agent/providers/"+created.Provider.ID, map[string]any{
		"display_name": "OpenAI Release",
		"openai": map[string]any{
			"model": "gpt-4.1-mini",
		},
	}))

	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("update expected 200, got %d body=%s", updateRecorder.Code, updateRecorder.Body.String())
	}
	var payload struct {
		Provider struct {
			DisplayName string `json:"display_name"`
			OpenAI      struct {
				Model string `json:"model"`
			} `json:"openai"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(updateRecorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal update: %v", err)
	}
	if payload.Provider.DisplayName != "OpenAI Release" || payload.Provider.OpenAI.Model != "gpt-4.1-mini" {
		t.Fatalf("unexpected provider payload: %#v", payload.Provider)
	}
}

func TestSetActiveProviderUpdatesCatalog(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "openai",
		"openai": map[string]any{
			"base_url": "https://api.openai.com/v1",
			"model":    "gpt-4o-mini",
			"api_key":  "sk-provider-test",
		},
	}))
	var created struct {
		Provider struct {
			ID string `json:"id"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, "/api/v1/agent/providers/active", map[string]any{
		"id": created.Provider.ID,
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		ActiveProviderID string `json:"active_provider_id"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal set active: %v", err)
	}
	if payload.ActiveProviderID != created.Provider.ID {
		t.Fatalf("expected active provider %q, got %#v", created.Provider.ID, payload)
	}
}

func TestCreateProviderRejectsInvalidConfig(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "openai",
		"openai": map[string]any{
			"base_url": "https://api.openai.com/v1",
			"model":    "gpt-4o-mini",
		},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Error.Code != "invalid_provider_config" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func TestDeleteProviderRejectsActiveProvider(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/agent/providers/ollama-local", nil))

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestUpdateProviderRejectsClearingSecretWithoutReplacement(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "openai",
		"openai": map[string]any{
			"base_url": "https://api.openai.com/v1",
			"model":    "gpt-4o-mini",
			"api_key":  "sk-provider-test",
		},
	}))
	var created struct {
		Provider struct {
			ID string `json:"id"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPatch, "/api/v1/agent/providers/"+created.Provider.ID, map[string]any{
		"openai": map[string]any{
			"clear_api_key": true,
		},
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "sk-provider-test") {
		t.Fatalf("expected response to stay masked, got %s", recorder.Body.String())
	}
}

func TestDiscoverProviderModelsLoadsOpenAIModelsForDraft(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer sk-provider-test" {
			t.Fatalf("unexpected auth header: %q", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{
				{"id": "gpt-5"},
				{"id": "gpt-5-mini"},
			},
		})
	}))
	defer server.Close()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers/models", map[string]any{
		"kind": "openai",
		"openai": map[string]any{
			"base_url": server.URL + "/v1",
			"api_key":  "sk-provider-test",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Models []string `json:"models"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal models: %v", err)
	}
	if !slices.Equal(payload.Models, []string{"gpt-5", "gpt-5-mini"}) {
		t.Fatalf("unexpected models: %#v", payload.Models)
	}
}

func TestDiscoverProviderModelsLoadsOllamaModelsForDraft(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/tags" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"models": []map[string]any{
				{"name": "llama3.2:3b"},
				{"name": "qwen3:8b"},
			},
		})
	}))
	defer server.Close()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers/models", map[string]any{
		"kind": "ollama",
		"ollama": map[string]any{
			"base_url": server.URL + "/v1",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Models []string `json:"models"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal models: %v", err)
	}
	if !slices.Equal(payload.Models, []string{"llama3.2:3b", "qwen3:8b"}) {
		t.Fatalf("unexpected models: %#v", payload.Models)
	}
}

func TestDiscoverProviderModelsUsesStoredOpenAISecret(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer sk-provider-test" {
			t.Fatalf("unexpected auth header: %q", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{
				{"id": "gpt-5.2"},
			},
		})
	}))
	defer server.Close()

	handler, _ := newTestHandler(t)

	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "openai",
		"openai": map[string]any{
			"base_url": server.URL + "/v1",
			"model":    "gpt-5.2",
			"api_key":  "sk-provider-test",
		},
	}))
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("expected create 200, got %d body=%s", createRecorder.Code, createRecorder.Body.String())
	}

	var created struct {
		Provider struct {
			ID string `json:"id"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers/models", map[string]any{
		"provider_id": created.Provider.ID,
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Models []string `json:"models"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal models: %v", err)
	}
	if !slices.Equal(payload.Models, []string{"gpt-5.2"}) {
		t.Fatalf("unexpected models: %#v", payload.Models)
	}
}

func TestCreateProxyProviderMasksChannelSecrets(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind":         "proxy",
		"display_name": "Proxy",
		"proxy": map[string]any{
			"model": "assistant-default",
			"channels": []map[string]any{
				{
					"id":           "codex-primary",
					"name":         "Codex",
					"service_type": "openai",
					"base_url":     "https://example.com/v1",
					"api_keys": []map[string]any{
						{"key": "sk-proxy-secret", "enabled": true},
					},
				},
			},
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "sk-proxy-secret") {
		t.Fatalf("expected secret to stay masked, got %s", recorder.Body.String())
	}

	var payload struct {
		Provider struct {
			Kind  string `json:"kind"`
			Proxy struct {
				Model    string `json:"model"`
				Channels []struct {
					KeyCount        int `json:"key_count"`
					EnabledKeyCount int `json:"enabled_key_count"`
				} `json:"channels"`
			} `json:"proxy"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Provider.Kind != "proxy" || payload.Provider.Proxy.Model != "assistant-default" {
		t.Fatalf("unexpected proxy payload: %#v", payload.Provider)
	}
	if len(payload.Provider.Proxy.Channels) != 1 || payload.Provider.Proxy.Channels[0].EnabledKeyCount != 1 {
		t.Fatalf("unexpected channel payload: %#v", payload.Provider.Proxy.Channels)
	}
}

func TestUpdateProxyProviderPreservesChannelSecretsWhenAPIKeysOmitted(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind":         "proxy",
		"display_name": "Proxy",
		"proxy": map[string]any{
			"model": "assistant-default",
			"channels": []map[string]any{
				{
					"id":           "codex-primary",
					"name":         "Codex",
					"service_type": "openai",
					"base_url":     "https://example.com/v1",
					"api_keys": []map[string]any{
						{"key": "sk-proxy-secret", "enabled": true},
					},
				},
			},
		},
	}))

	if createRecorder.Code != http.StatusOK {
		t.Fatalf("expected create 200, got %d body=%s", createRecorder.Code, createRecorder.Body.String())
	}

	var created struct {
		Provider struct {
			ID string `json:"id"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create: %v", err)
	}

	updateRecorder := httptest.NewRecorder()
	handler.ServeHTTP(updateRecorder, authedJSONRequest(t, http.MethodPatch, "/api/v1/agent/providers/"+created.Provider.ID, map[string]any{
		"proxy": map[string]any{
			"channels": []map[string]any{
				{
					"id":           "codex-primary",
					"name":         "Codex EU",
					"service_type": "openai",
					"base_url":     "https://example.eu/v1",
				},
			},
		},
	}))

	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("expected update 200, got %d body=%s", updateRecorder.Code, updateRecorder.Body.String())
	}
	if strings.Contains(updateRecorder.Body.String(), "sk-proxy-secret") {
		t.Fatalf("expected response to stay masked, got %s", updateRecorder.Body.String())
	}

	var payload struct {
		Provider struct {
			Proxy struct {
				Channels []struct {
					Name            string `json:"name"`
					BaseURL         string `json:"base_url"`
					KeyCount        int    `json:"key_count"`
					EnabledKeyCount int    `json:"enabled_key_count"`
				} `json:"channels"`
			} `json:"proxy"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(updateRecorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal update: %v", err)
	}
	if len(payload.Provider.Proxy.Channels) != 1 {
		t.Fatalf("unexpected proxy channels: %#v", payload.Provider.Proxy.Channels)
	}
	channel := payload.Provider.Proxy.Channels[0]
	if channel.Name != "Codex EU" || channel.BaseURL != "https://example.eu/v1" {
		t.Fatalf("expected updated channel metadata, got %#v", channel)
	}
	if channel.KeyCount != 1 || channel.EnabledKeyCount != 1 {
		t.Fatalf("expected preserved key counts, got %#v", channel)
	}
}
