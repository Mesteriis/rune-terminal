package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
