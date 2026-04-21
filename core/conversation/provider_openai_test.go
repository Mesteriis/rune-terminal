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

func TestOpenAIProviderCompletesChatResponse(t *testing.T) {
	t.Parallel()

	var seenAuth string
	var seenRequest openAIChatCompletionRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&seenRequest); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gpt-4o-mini",
			"choices": []map[string]any{
				{
					"message": map[string]any{
						"content": "assistant reply",
					},
				},
			},
		})
	}))
	defer server.Close()

	provider := NewOpenAIProvider(OpenAIProviderConfig{
		BaseURL: server.URL,
		Model:   "gpt-4o-mini",
		APIKey:  "sk-openai-test",
	})
	result, info, err := provider.Complete(context.Background(), CompletionRequest{
		SystemPrompt: "system prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "hello"},
		},
	})
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if seenAuth != "Bearer sk-openai-test" {
		t.Fatalf("unexpected authorization header: %q", seenAuth)
	}
	if seenRequest.Model != "gpt-4o-mini" || len(seenRequest.Messages) != 2 {
		t.Fatalf("unexpected request: %#v", seenRequest)
	}
	if result.Content != "assistant reply" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if info.Kind != "openai" || !info.Streaming {
		t.Fatalf("unexpected provider info: %#v", info)
	}
}

func TestOpenAIProviderStreamsRealTextDeltas(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("expected flusher")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		blocks := []string{
			`data: {"model":"gpt-4o-mini","choices":[{"delta":{"content":"hello "}}]}`,
			``,
			`data: {"model":"gpt-4o-mini","choices":[{"delta":{"content":"world"}}]}`,
			``,
			`data: [DONE]`,
			``,
		}
		for _, block := range blocks {
			if _, err := fmt.Fprintln(w, block); err != nil {
				t.Fatalf("write block: %v", err)
			}
			flusher.Flush()
		}
	}))
	defer server.Close()

	provider := NewOpenAIProvider(OpenAIProviderConfig{
		BaseURL: server.URL,
		Model:   "gpt-4o-mini",
		APIKey:  "sk-openai-test",
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
		t.Fatalf("CompleteStream error: %v", err)
	}
	if !slices.Equal(deltas, []string{"hello ", "world"}) {
		t.Fatalf("unexpected deltas: %#v", deltas)
	}
	if result.Content != "hello world" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if info.Model != "gpt-4o-mini" {
		t.Fatalf("unexpected info: %#v", info)
	}
}

func TestOpenAIProviderRequiresAPIKey(t *testing.T) {
	t.Parallel()

	provider := NewOpenAIProvider(OpenAIProviderConfig{
		BaseURL: "https://api.openai.com/v1",
		Model:   "gpt-4o-mini",
	})
	_, _, err := provider.Complete(context.Background(), CompletionRequest{
		SystemPrompt: "system prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "hello"},
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}
