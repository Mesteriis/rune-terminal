package conversation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"
)

func TestOllamaProviderResolvesPreferredModelAndCompletes(t *testing.T) {
	t.Parallel()

	var seenModel string
	var seenMessages []ollamaMessage
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/tags":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"models": []map[string]any{
					{"name": "gemma2:9b"},
					{"name": "llama3.2:3b"},
					{"name": "qwen3:8b"},
				},
			})
		case "/api/chat":
			var request ollamaChatRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatalf("decode chat request: %v", err)
			}
			seenModel = request.Model
			seenMessages = request.Messages
			_ = json.NewEncoder(w).Encode(map[string]any{
				"model": "llama3.2:3b",
				"message": map[string]any{
					"role":    "assistant",
					"content": "assistant reply",
				},
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	provider := NewOllamaProvider(ProviderConfig{BaseURL: server.URL})
	result, info, err := provider.Complete(context.Background(), CompletionRequest{
		SystemPrompt: "system prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "hello"},
		},
	})
	if err != nil {
		t.Fatalf("complete: %v", err)
	}
	if seenModel != "llama3.2:3b" {
		t.Fatalf("expected preferred model, got %q", seenModel)
	}
	if len(seenMessages) != 2 || seenMessages[0].Role != "system" || seenMessages[1].Role != "user" {
		t.Fatalf("unexpected messages: %#v", seenMessages)
	}
	if result.Content != "assistant reply" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if info.Model != "llama3.2:3b" {
		t.Fatalf("expected provider info model to be cached, got %q", info.Model)
	}
}

func TestOllamaProviderUsesConfiguredModelWithoutTagsLookup(t *testing.T) {
	t.Parallel()

	var tagsCalls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/tags":
			tagsCalls++
			t.Fatalf("tags lookup should not run when model is configured")
		case "/api/chat":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"model": "configured:model",
				"message": map[string]any{
					"role":    "assistant",
					"content": "ok",
				},
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	provider := NewOllamaProvider(ProviderConfig{
		BaseURL: server.URL,
		Model:   "configured:model",
	})
	_, info, err := provider.Complete(context.Background(), CompletionRequest{
		SystemPrompt: "system prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "hello"},
		},
	})
	if err != nil {
		t.Fatalf("complete: %v", err)
	}
	if tagsCalls != 0 {
		t.Fatalf("expected no tags calls, got %d", tagsCalls)
	}
	if info.Model != "configured:model" {
		t.Fatalf("expected configured model, got %q", info.Model)
	}
}

func TestOllamaProviderStreamsRealTextDeltas(t *testing.T) {
	t.Parallel()

	var seenRequest ollamaChatRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/chat" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&seenRequest); err != nil {
			t.Fatalf("decode chat request: %v", err)
		}
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("expected test server flusher")
		}
		w.Header().Set("Content-Type", "application/x-ndjson")
		chunks := []map[string]any{
			{
				"model": "configured:model",
				"message": map[string]any{
					"role":    "assistant",
					"content": "hello ",
				},
			},
			{
				"model": "configured:model",
				"message": map[string]any{
					"role":    "assistant",
					"content": "world",
				},
			},
			{
				"model": "configured:model",
				"message": map[string]any{
					"role":    "assistant",
					"content": "",
				},
				"done": true,
			},
		}
		for _, chunk := range chunks {
			if _, err := fmt.Fprintln(w, mustJSON(t, chunk)); err != nil {
				t.Fatalf("write chunk: %v", err)
			}
			flusher.Flush()
		}
	}))
	defer server.Close()

	provider := NewOllamaProvider(ProviderConfig{
		BaseURL: server.URL,
		Model:   "configured:model",
	})
	var deltas []string
	result, info, err := provider.CompleteStream(context.Background(), CompletionRequest{
		SystemPrompt: "system prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "hello"},
		},
	}, func(delta string) error {
		deltas = append(deltas, delta)
		return nil
	})
	if err != nil {
		t.Fatalf("complete stream: %v", err)
	}
	if !seenRequest.Stream {
		t.Fatalf("expected streaming request, got %#v", seenRequest)
	}
	if !slices.Equal(deltas, []string{"hello ", "world"}) {
		t.Fatalf("unexpected deltas: %#v", deltas)
	}
	if result.Content != "hello world" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if !info.Streaming {
		t.Fatalf("expected provider info to report streaming")
	}
}

func mustJSON(t *testing.T, payload any) string {
	t.Helper()

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return string(raw)
}
