package aiproxy

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func TestProviderCompleteOpenAIChannel(t *testing.T) {
	t.Parallel()

	var seenAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if payload["model"] != "gpt-4.1-mini" {
			t.Fatalf("unexpected model: %#v", payload["model"])
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gpt-4.1-mini",
			"choices": []map[string]any{
				{"message": map[string]any{"content": "openai reply"}},
			},
		})
	}))
	defer server.Close()

	provider, err := NewProvider(Config{
		Model: "codex-mini",
		Channels: []Channel{{
			ID:          "openai-primary",
			Name:        "Codex",
			ServiceType: ServiceTypeOpenAI,
			BaseURL:     server.URL + "/v1",
			APIKeys: []APIKey{{
				Key:     "sk-openai-test",
				Enabled: true,
			}},
			ModelMapping: map[string]string{
				"codex-mini": "gpt-4.1-mini",
			},
		}},
	})
	if err != nil {
		t.Fatalf("NewProvider error: %v", err)
	}

	result, info, err := provider.Complete(context.Background(), testCompletionRequest())
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if seenAuth != "Bearer sk-openai-test" {
		t.Fatalf("unexpected auth header: %q", seenAuth)
	}
	if result.Content != "openai reply" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if info.Model != "gpt-4.1-mini" {
		t.Fatalf("unexpected provider info: %#v", info)
	}
}

func TestProviderCompleteClaudeChannel(t *testing.T) {
	t.Parallel()

	var seenAPIKey string
	var seenVersion string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/messages" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAPIKey = r.Header.Get("x-api-key")
		seenVersion = r.Header.Get("anthropic-version")
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if payload["model"] != "claude-sonnet-4-5" {
			t.Fatalf("unexpected model: %#v", payload["model"])
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "claude-sonnet-4-5",
			"content": []map[string]any{
				{"type": "text", "text": "claude reply"},
			},
		})
	}))
	defer server.Close()

	provider, err := NewProvider(Config{
		Model: "assistant-default",
		Channels: []Channel{{
			ID:          "claude-primary",
			Name:        "Cloud Code",
			ServiceType: ServiceTypeClaude,
			BaseURL:     server.URL,
			APIKeys: []APIKey{{
				Key:     "claude-secret",
				Enabled: true,
			}},
			ModelMapping: map[string]string{
				"assistant-default": "claude-sonnet-4-5",
			},
		}},
	})
	if err != nil {
		t.Fatalf("NewProvider error: %v", err)
	}

	result, info, err := provider.Complete(context.Background(), testCompletionRequest())
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if seenAPIKey != "claude-secret" {
		t.Fatalf("unexpected api key header: %q", seenAPIKey)
	}
	if seenVersion != anthropicVersion {
		t.Fatalf("unexpected anthropic version: %q", seenVersion)
	}
	if result.Content != "claude reply" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if info.Model != "claude-sonnet-4-5" {
		t.Fatalf("unexpected provider info: %#v", info)
	}
}

func TestProviderCompleteGeminiChannel(t *testing.T) {
	t.Parallel()

	var seenAPIKey string
	var seenQueryKey string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1beta/models/gemini-2.5-flash:generateContent" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAPIKey = r.Header.Get("x-goog-api-key")
		seenQueryKey = r.URL.Query().Get("key")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"modelVersion": "gemini-2.5-flash",
			"candidates": []map[string]any{
				{
					"content": map[string]any{
						"parts": []map[string]any{
							{"text": "gemini reply"},
						},
					},
				},
			},
		})
	}))
	defer server.Close()

	provider, err := NewProvider(Config{
		Model: "assistant-default",
		Channels: []Channel{{
			ID:          "gemini-primary",
			Name:        "Gemini",
			ServiceType: ServiceTypeGemini,
			BaseURL:     server.URL + "/v1beta",
			AuthType:    AuthTypeGoogAPIKey,
			APIKeys: []APIKey{{
				Key:     "gemini-secret",
				Enabled: true,
			}},
			ModelMapping: map[string]string{
				"assistant-default": "gemini-2.5-flash",
			},
		}},
	})
	if err != nil {
		t.Fatalf("NewProvider error: %v", err)
	}

	result, info, err := provider.Complete(context.Background(), testCompletionRequest())
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if seenAPIKey != "gemini-secret" || seenQueryKey != "gemini-secret" {
		t.Fatalf("unexpected gemini auth headers/query: header=%q query=%q", seenAPIKey, seenQueryKey)
	}
	if result.Content != "gemini reply" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if info.Model != "gemini-2.5-flash" {
		t.Fatalf("unexpected provider info: %#v", info)
	}
}

func TestProviderFailsOverAcrossChannels(t *testing.T) {
	t.Parallel()

	first := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "upstream down", http.StatusBadGateway)
	}))
	defer first.Close()

	second := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gpt-4o-mini",
			"choices": []map[string]any{
				{"message": map[string]any{"content": "fallback reply"}},
			},
		})
	}))
	defer second.Close()

	provider, err := NewProvider(Config{
		Model: "assistant-default",
		Channels: []Channel{
			{
				ID:          "primary",
				Name:        "Primary",
				ServiceType: ServiceTypeOpenAI,
				BaseURL:     first.URL + "/v1",
				Priority:    0,
			},
			{
				ID:          "fallback",
				Name:        "Fallback",
				ServiceType: ServiceTypeOpenAI,
				BaseURL:     second.URL + "/v1",
				Priority:    1,
			},
		},
	})
	if err != nil {
		t.Fatalf("NewProvider error: %v", err)
	}

	result, _, err := provider.Complete(context.Background(), testCompletionRequest())
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if result.Content != "fallback reply" {
		t.Fatalf("unexpected failover result: %q", result.Content)
	}
}

func TestProviderCompleteStreamBuffersFullReply(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gpt-4o-mini",
			"choices": []map[string]any{
				{"message": map[string]any{"content": "buffered stream"}},
			},
		})
	}))
	defer server.Close()

	provider, err := NewProvider(Config{
		Model: "assistant-default",
		Channels: []Channel{{
			ID:          "stream",
			Name:        "Stream",
			ServiceType: ServiceTypeOpenAI,
			BaseURL:     server.URL + "/v1",
		}},
	})
	if err != nil {
		t.Fatalf("NewProvider error: %v", err)
	}

	var deltas []string
	result, _, err := provider.CompleteStream(context.Background(), testCompletionRequest(), func(delta string) error {
		deltas = append(deltas, delta)
		return nil
	})
	if err != nil {
		t.Fatalf("CompleteStream error: %v", err)
	}
	if result.Content != "buffered stream" {
		t.Fatalf("unexpected content: %q", result.Content)
	}
	if joined := strings.Join(deltas, ""); joined != "buffered stream" {
		t.Fatalf("unexpected deltas: %#v", deltas)
	}
}

func testCompletionRequest() conversation.CompletionRequest {
	return conversation.CompletionRequest{
		SystemPrompt: "You are helpful.",
		Messages: []conversation.ChatMessage{
			{Role: conversation.RoleUser, Content: "hello"},
		},
	}
}
