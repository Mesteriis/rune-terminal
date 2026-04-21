package conversation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestCodexProviderCompletesResponsesRequest(t *testing.T) {
	t.Parallel()

	authPath := writeCodexAuthFile(t, map[string]any{
		"auth_mode": "chatgpt",
		"tokens": map[string]any{
			"access_token": "access-token",
			"account_id":   "acct_123",
		},
	})

	var seenAuth string
	var seenAccountID string
	var seenOriginator string
	var seenRequest codexResponsesRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/backend-api/codex/responses" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		seenAccountID = r.Header.Get("Chatgpt-Account-Id")
		seenOriginator = r.Header.Get("Originator")
		if err := json.NewDecoder(r.Body).Decode(&seenRequest); err != nil {
			t.Fatalf("Decode error: %v", err)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gpt-5-codex",
			"output": []map[string]any{
				{
					"type": "message",
					"content": []map[string]any{
						{
							"type": "output_text",
							"text": "assistant reply",
						},
					},
				},
			},
		})
	}))
	defer server.Close()

	provider := NewCodexProvider(CodexProviderConfig{
		Model:        "gpt-5-codex",
		AuthFilePath: authPath,
	})
	provider.client = rewriteClient(server, t)

	result, info, err := provider.Complete(context.Background(), CompletionRequest{
		SystemPrompt: "system prompt",
		Messages: []ChatMessage{
			{Role: RoleUser, Content: "hello"},
		},
	})
	if err != nil {
		t.Fatalf("Complete error: %v", err)
	}
	if seenAuth != "Bearer access-token" {
		t.Fatalf("unexpected auth header: %q", seenAuth)
	}
	if seenAccountID != "acct_123" || seenOriginator != codexOriginator {
		t.Fatalf("unexpected codex headers: account=%q originator=%q", seenAccountID, seenOriginator)
	}
	if seenRequest.Model != "gpt-5-codex" || seenRequest.Instructions != "system prompt" {
		t.Fatalf("unexpected request: %#v", seenRequest)
	}
	if len(seenRequest.Input) != 1 || seenRequest.Input[0].Content[0].Text != "hello" {
		t.Fatalf("unexpected input messages: %#v", seenRequest.Input)
	}
	if result.Content != "assistant reply" {
		t.Fatalf("unexpected result: %#v", result)
	}
	if info.Kind != "codex" || info.BaseURL != "https://chatgpt.com/backend-api/codex" || info.Model != "gpt-5-codex" {
		t.Fatalf("unexpected provider info: %#v", info)
	}
}

func TestCodexProviderStreamsResponseDeltas(t *testing.T) {
	t.Parallel()

	authPath := writeCodexAuthFile(t, map[string]any{
		"OPENAI_API_KEY": "sk-codex",
		"auth_mode":      "api_key",
	})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/responses" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("expected flusher")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		blocks := []string{
			`data: {"type":"response.output_text.delta","delta":"hello "}`,
			``,
			`data: {"type":"response.output_text.delta","delta":"world"}`,
			``,
			`data: {"type":"response.completed","response":{"model":"gpt-5-codex","output":[{"type":"message","content":[{"type":"output_text","text":"hello world"}]}]}}`,
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

	provider := NewCodexProvider(CodexProviderConfig{
		Model:        "gpt-5-codex",
		AuthFilePath: authPath,
	})
	provider.client = rewriteClient(server, t)

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
	if result.Content != "hello world" || info.Model != "gpt-5-codex" {
		t.Fatalf("unexpected result/info: result=%#v info=%#v", result, info)
	}
}

func TestCodexProviderRequiresLocalCredentials(t *testing.T) {
	t.Parallel()

	provider := NewCodexProvider(CodexProviderConfig{
		Model:        "gpt-5-codex",
		AuthFilePath: filepath.Join(t.TempDir(), "missing-auth.json"),
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

func writeCodexAuthFile(t *testing.T, payload map[string]any) string {
	t.Helper()

	path := filepath.Join(t.TempDir(), "auth.json")
	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndent error: %v", err)
	}
	if err := os.WriteFile(path, raw, 0o600); err != nil {
		t.Fatalf("WriteFile error: %v", err)
	}
	return path
}

func rewriteClient(server *httptest.Server, t *testing.T) *http.Client {
	t.Helper()

	target, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("url.Parse error: %v", err)
	}
	client := server.Client()
	baseTransport := client.Transport
	if baseTransport == nil {
		baseTransport = http.DefaultTransport
	}
	client.Transport = roundTripperFunc(func(req *http.Request) (*http.Response, error) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		return baseTransport.RoundTrip(req)
	})
	return client
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (fn roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}
