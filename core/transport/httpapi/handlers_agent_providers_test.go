package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func TestProviderCatalogReturnsBootstrapCLIProviders(t *testing.T) {
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
	if payload.ActiveProviderID != "codex-cli" {
		t.Fatalf("expected active codex provider, got %#v", payload)
	}
	if len(payload.Providers) != 2 || payload.Providers[0].Kind != "codex" || payload.Providers[1].Kind != "claude" {
		t.Fatalf("expected bootstrap cli providers, got %#v", payload.Providers)
	}
	if !slices.Equal(payload.SupportedKinds, []string{"codex", "claude", "openai-compatible"}) {
		t.Fatalf("unexpected supported kinds: %#v", payload.SupportedKinds)
	}
}

func TestCreateProviderPersistsClaudeCLIConfig(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind":         "claude",
		"display_name": "Claude Test",
		"claude": map[string]any{
			"command":     "claude",
			"model":       "opus",
			"chat_models": []string{"sonnet", "opus"},
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Provider struct {
			ID     string `json:"id"`
			Kind   string `json:"kind"`
			Claude struct {
				Command    string   `json:"command"`
				Model      string   `json:"model"`
				ChatModels []string `json:"chat_models"`
			} `json:"claude"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Provider.ID == "" || payload.Provider.Kind != "claude" || payload.Provider.Claude.Model != "opus" {
		t.Fatalf("unexpected provider payload: %#v", payload.Provider)
	}
	if !slices.Equal(payload.Provider.Claude.ChatModels, []string{"opus", "sonnet"}) {
		t.Fatalf("unexpected chat models: %#v", payload.Provider.Claude.ChatModels)
	}
}

func TestUpdateProviderUpdatesPersistedCLIConfig(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "codex",
		"codex": map[string]any{
			"command": "codex",
			"model":   "gpt-5-codex",
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
		"display_name": "Codex Release",
		"codex": map[string]any{
			"model":       "gpt-5.4",
			"chat_models": []string{"gpt-5-codex"},
		},
	}))

	if updateRecorder.Code != http.StatusOK {
		t.Fatalf("update expected 200, got %d body=%s", updateRecorder.Code, updateRecorder.Body.String())
	}
	var payload struct {
		Provider struct {
			DisplayName string `json:"display_name"`
			Codex       struct {
				Model      string   `json:"model"`
				ChatModels []string `json:"chat_models"`
			} `json:"codex"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(updateRecorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal update: %v", err)
	}
	if payload.Provider.DisplayName != "Codex Release" || payload.Provider.Codex.Model != "gpt-5.4" {
		t.Fatalf("unexpected provider payload: %#v", payload.Provider)
	}
	if !slices.Equal(payload.Provider.Codex.ChatModels, []string{"gpt-5.4", "gpt-5-codex"}) {
		t.Fatalf("unexpected provider payload: %#v", payload.Provider)
	}
}

func TestSetActiveProviderUpdatesCatalog(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "claude",
		"claude": map[string]any{
			"command": "claude",
			"model":   "sonnet",
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

func TestCreateProviderRejectsUnsupportedLegacyKind(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "ollama",
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
	if payload.Error.Code != "provider_kind_unsupported" {
		t.Fatalf("unexpected error code: %q", payload.Error.Code)
	}
}

func TestDeleteProviderRejectsActiveProvider(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodDelete, "/api/v1/agent/providers/codex-cli", nil))

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestDiscoverProviderModelsReturnsCodexCLIModelsForDraft(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers/models", map[string]any{
		"kind": "codex",
		"codex": map[string]any{
			"model": "gpt-5.4",
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
	if !slices.Equal(payload.Models, []string{"gpt-5.4", "gpt-5-codex"}) {
		t.Fatalf("unexpected models: %#v", payload.Models)
	}
}

func TestDiscoverProviderModelsReturnsClaudeCodeModelsForStoredProvider(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	createRecorder := httptest.NewRecorder()
	handler.ServeHTTP(createRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind": "claude",
		"claude": map[string]any{
			"model":       "opus",
			"chat_models": []string{"sonnet"},
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
	if !slices.Equal(payload.Models, []string{"opus", "sonnet"}) {
		t.Fatalf("unexpected models: %#v", payload.Models)
	}
}

func TestProviderGatewaySnapshotReturnsRecentRunsAndStats(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandlerWithConversationProvider(t, gatewayCodexProvider{}, testAuthToken)

	submitRecorder := httptest.NewRecorder()
	handler.ServeHTTP(submitRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "hello gateway",
		"context": map[string]any{
			"workspace_id": "ws-default",
		},
	}))
	if submitRecorder.Code != http.StatusOK {
		t.Fatalf("submit expected 200, got %d body=%s", submitRecorder.Code, submitRecorder.Body.String())
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent/providers/gateway", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Providers []struct {
			ProviderID    string `json:"provider_id"`
			ProviderKind  string `json:"provider_kind"`
			TotalRuns     int    `json:"total_runs"`
			SucceededRuns int    `json:"succeeded_runs"`
			LastStatus    string `json:"last_status"`
		} `json:"providers"`
		RecentRuns []struct {
			ProviderID string `json:"provider_id"`
			Status     string `json:"status"`
			Model      string `json:"model"`
		} `json:"recent_runs"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if len(payload.RecentRuns) == 0 {
		t.Fatalf("expected at least one recent run, got %#v", payload)
	}
	if payload.RecentRuns[0].ProviderID != "codex-cli" || payload.RecentRuns[0].Status != "succeeded" {
		t.Fatalf("unexpected recent run payload: %#v", payload.RecentRuns[0])
	}
	if payload.RecentRuns[0].Model != "gpt-5.4" {
		t.Fatalf("expected recorded model, got %#v", payload.RecentRuns[0])
	}

	var codexProvider struct {
		ProviderID    string `json:"provider_id"`
		ProviderKind  string `json:"provider_kind"`
		TotalRuns     int    `json:"total_runs"`
		SucceededRuns int    `json:"succeeded_runs"`
		LastStatus    string `json:"last_status"`
	}
	for _, provider := range payload.Providers {
		if provider.ProviderID == "codex-cli" {
			codexProvider = provider
			break
		}
	}
	if codexProvider.ProviderID == "" {
		t.Fatalf("expected codex provider stats in payload: %#v", payload.Providers)
	}
	if codexProvider.ProviderKind != "codex" || codexProvider.TotalRuns != 1 || codexProvider.SucceededRuns != 1 || codexProvider.LastStatus != "succeeded" {
		t.Fatalf("unexpected codex provider stats: %#v", codexProvider)
	}
}

func TestProbeProviderReturnsReachableOpenAICompatibleStatus(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"id":"gpt-5.4"},{"id":"gpt-5.4-mini"}]}`))
	}))
	defer server.Close()

	handler, agentStore := newTestHandler(t)
	createdProvider, _, err := agentStore.CreateProvider(agent.CreateProviderInput{
		Kind:        agent.ProviderKindOpenAICompatible,
		DisplayName: "LAN Source",
		Enabled:     boolPtr(true),
		OpenAICompatible: &agent.CreateOpenAICompatibleProviderInput{
			BaseURL: server.URL,
			Model:   "gpt-5.4",
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(
			t,
			http.MethodPost,
			"/api/v1/agent/providers/"+createdProvider.ID+"/probe",
			nil,
		),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		ProviderID       string   `json:"provider_id"`
		ProviderKind     string   `json:"provider_kind"`
		Ready            bool     `json:"ready"`
		StatusState      string   `json:"status_state"`
		StatusMessage    string   `json:"status_message"`
		BaseURL          string   `json:"base_url"`
		Model            string   `json:"model"`
		DiscoveredModels []string `json:"discovered_models"`
		CheckedAt        string   `json:"checked_at"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.ProviderID != createdProvider.ID || payload.ProviderKind != "openai-compatible" {
		t.Fatalf("unexpected provider probe payload: %#v", payload)
	}
	if !payload.Ready || payload.StatusState != "ready" {
		t.Fatalf("expected ready probe result, got %#v", payload)
	}
	if payload.BaseURL != server.URL || payload.Model != "gpt-5.4" || !slices.Equal(payload.DiscoveredModels, []string{"gpt-5.4", "gpt-5.4-mini"}) {
		t.Fatalf("unexpected provider probe payload: %#v", payload)
	}
	if _, err := time.Parse(time.RFC3339Nano, payload.CheckedAt); err != nil {
		t.Fatalf("expected RFC3339 checked_at, got %q", payload.CheckedAt)
	}
}

type gatewayCodexProvider struct{}

func (gatewayCodexProvider) Info() conversation.ProviderInfo {
	return conversation.ProviderInfo{
		Kind:      "codex",
		Model:     "gpt-5.4",
		Streaming: true,
	}
}

func (gatewayCodexProvider) Complete(context.Context, conversation.CompletionRequest) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	info := gatewayCodexProvider{}.Info()
	return conversation.CompletionResult{
		Content: "gateway ok",
		Model:   info.Model,
	}, info, nil
}

func (gatewayCodexProvider) CompleteStream(
	context.Context,
	conversation.CompletionRequest,
	func(string) error,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	info := gatewayCodexProvider{}.Info()
	return conversation.CompletionResult{
		Content: "gateway ok",
		Model:   info.Model,
	}, info, nil
}

func boolPtr(value bool) *bool {
	return &value
}

func TestCreateProviderPersistsOpenAICompatibleConfig(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers", map[string]any{
		"kind":         "openai-compatible",
		"display_name": "LAN Gateway",
		"openai_compatible": map[string]any{
			"base_url":    "http://192.168.1.8:8317/",
			"model":       "gemini-3-pro-high",
			"chat_models": []string{"gpt-5.4"},
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Provider struct {
			Kind             string `json:"kind"`
			OpenAICompatible struct {
				BaseURL    string   `json:"base_url"`
				Model      string   `json:"model"`
				ChatModels []string `json:"chat_models"`
			} `json:"openai_compatible"`
		} `json:"provider"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Provider.Kind != "openai-compatible" {
		t.Fatalf("unexpected provider payload: %#v", payload.Provider)
	}
	if payload.Provider.OpenAICompatible.BaseURL != "http://192.168.1.8:8317" {
		t.Fatalf("unexpected base URL: %#v", payload.Provider.OpenAICompatible)
	}
	if !slices.Equal(payload.Provider.OpenAICompatible.ChatModels, []string{"gemini-3-pro-high", "gpt-5.4"}) {
		t.Fatalf("unexpected chat models: %#v", payload.Provider.OpenAICompatible.ChatModels)
	}
}

func TestDiscoverProviderModelsReturnsOpenAICompatibleModelsForDraft(t *testing.T) {
	t.Parallel()

	modelsServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if err := json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{
				{"id": "gemini-3-pro-high"},
				{"id": "gpt-5.4"},
			},
		}); err != nil {
			t.Fatalf("encode models: %v", err)
		}
	}))
	defer modelsServer.Close()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/providers/models", map[string]any{
		"kind": "openai-compatible",
		"openai_compatible": map[string]any{
			"base_url": modelsServer.URL,
			"model":    "gemini-3-pro-high",
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
	if !slices.Equal(payload.Models, []string{"gemini-3-pro-high", "gpt-5.4"}) {
		t.Fatalf("unexpected models: %#v", payload.Models)
	}
}
