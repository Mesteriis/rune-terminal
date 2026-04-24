package conversation

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDiscoverOpenAICompatibleModels(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{
				{"id": "gemini-3-pro-high"},
				{"id": "gpt-5.4"},
				{"id": "gpt-5.4"},
			},
		})
	}))
	defer server.Close()

	models, err := DiscoverOpenAICompatibleModels(context.Background(), server.URL)
	if err != nil {
		t.Fatalf("DiscoverOpenAICompatibleModels error: %v", err)
	}
	if len(models) != 2 || models[0] != "gemini-3-pro-high" || models[1] != "gpt-5.4" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestOpenAICompatibleProviderComplete(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("unexpected method: %s", r.Method)
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if payload["model"] != "gemini-3-pro-high" {
			t.Fatalf("unexpected model: %#v", payload)
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{
					"message": map[string]any{
						"content": "Привет!",
					},
				},
			},
		})
	}))
	defer server.Close()

	provider := NewOpenAICompatibleProvider(OpenAICompatibleProviderConfig{
		BaseURL: server.URL,
		Model:   "gemini-3-pro-high",
	})

	result, info, err := provider.Complete(context.Background(), CompletionRequest{
		SystemPrompt: "System prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "Скажи привет"},
		},
	})
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if result.Content != "Привет!" {
		t.Fatalf("unexpected result: %#v", result)
	}
	if info.Kind != "openai-compatible" || info.BaseURL != server.URL || info.Model != "gemini-3-pro-high" {
		t.Fatalf("unexpected provider info: %#v", info)
	}
}
