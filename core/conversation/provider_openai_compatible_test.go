package conversation

import (
	"context"
	"encoding/json"
	"fmt"
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
		if payload["stream"] != false {
			t.Fatalf("expected non-streaming completion request, got %#v", payload)
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

func TestOpenAICompatibleProviderCompleteStreamEmitsDeltas(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Accept") != "text/event-stream" {
			t.Fatalf("expected text/event-stream accept header, got %q", r.Header.Get("Accept"))
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if payload["model"] != "stream-model" || payload["stream"] != true {
			t.Fatalf("unexpected stream request payload: %#v", payload)
		}

		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"Hello \"}}]}\n\n")
		_, _ = fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"world\"}}]}\n\n")
		_, _ = fmt.Fprint(w, "data: [DONE]\n\n")
	}))
	defer server.Close()

	provider := NewOpenAICompatibleProvider(OpenAICompatibleProviderConfig{
		BaseURL: server.URL,
		Model:   "stream-model",
	})

	var deltas []string
	result, info, err := provider.CompleteStream(context.Background(), CompletionRequest{
		SystemPrompt: "System prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "Say hello"},
		},
	}, func(delta string) error {
		deltas = append(deltas, delta)
		return nil
	})
	if err != nil {
		t.Fatalf("CompleteStream error: %v", err)
	}
	if result.Content != "Hello world" {
		t.Fatalf("unexpected stream result: %#v", result)
	}
	if len(deltas) != 2 || deltas[0] != "Hello " || deltas[1] != "world" {
		t.Fatalf("unexpected stream deltas: %#v", deltas)
	}
	if !info.Streaming {
		t.Fatalf("expected openai-compatible provider to report streaming support")
	}
}
