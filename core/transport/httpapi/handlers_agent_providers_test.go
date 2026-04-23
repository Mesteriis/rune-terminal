package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"
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
	if !slices.Equal(payload.SupportedKinds, []string{"codex", "claude"}) {
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
	if !slices.Equal(payload.Models, []string{"gpt-5.4"}) {
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
