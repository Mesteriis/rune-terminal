package conversation

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/codexauth"
)

func TestListOpenAIModelsLoadsModelIDs(t *testing.T) {
	t.Parallel()

	var seenAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{
				{"id": "gpt-5"},
				{"id": "gpt-5-mini"},
				{"id": "gpt-5"},
			},
		})
	}))
	defer server.Close()

	models, err := ListOpenAIModels(context.Background(), OpenAIProviderConfig{
		BaseURL: server.URL,
		APIKey:  "sk-openai-test",
	})
	if err != nil {
		t.Fatalf("ListOpenAIModels error: %v", err)
	}
	if seenAuth != "Bearer sk-openai-test" {
		t.Fatalf("unexpected auth header: %q", seenAuth)
	}
	if !slices.Equal(models, []string{"gpt-5", "gpt-5-mini"}) {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestListOpenAIModelsSupportsBaseURLWithoutV1(t *testing.T) {
	t.Parallel()

	var seenPaths []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenPaths = append(seenPaths, r.URL.Path)
		switch r.URL.Path {
		case "/models":
			http.NotFound(w, r)
		case "/v1/models":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data": []map[string]any{
					{"id": "gpt-4.1-mini"},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	models, err := ListOpenAIModels(context.Background(), OpenAIProviderConfig{
		BaseURL: server.URL,
		APIKey:  "sk-openai-test",
	})
	if err != nil {
		t.Fatalf("ListOpenAIModels error: %v", err)
	}
	if !slices.Equal(seenPaths, []string{"/models", "/v1/models"}) {
		t.Fatalf("unexpected model discovery path order: %#v", seenPaths)
	}
	if !slices.Equal(models, []string{"gpt-4.1-mini"}) {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestListOllamaModelsLoadsTagNames(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/tags" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"models": []map[string]any{
				{"name": "llama3.2:3b"},
				{"name": "qwen3:8b"},
				{"name": "llama3.2:3b"},
			},
		})
	}))
	defer server.Close()

	models, err := ListOllamaModels(context.Background(), ProviderConfig{
		BaseURL: server.URL + "/v1",
	})
	if err != nil {
		t.Fatalf("ListOllamaModels error: %v", err)
	}
	if !slices.Equal(models, []string{"llama3.2:3b", "qwen3:8b"}) {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestListOllamaModelsFallsBackToOpenAICompatibleCatalog(t *testing.T) {
	t.Parallel()

	var seenPaths []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenPaths = append(seenPaths, r.URL.Path)
		switch r.URL.Path {
		case "/api/tags":
			http.NotFound(w, r)
		case "/models":
			http.NotFound(w, r)
		case "/v1/models":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"data": []map[string]any{
					{"id": "llama3.2:3b"},
					{"id": "qwen3:8b"},
				},
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	models, err := ListOllamaModels(context.Background(), ProviderConfig{
		BaseURL: server.URL,
	})
	if err != nil {
		t.Fatalf("ListOllamaModels error: %v", err)
	}
	if !slices.Equal(seenPaths, []string{"/api/tags", "/models", "/v1/models"}) {
		t.Fatalf("unexpected fallback path order: %#v", seenPaths)
	}
	if !slices.Equal(models, []string{"llama3.2:3b", "qwen3:8b"}) {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestListCodexModelsLoadsChatGPTModelCatalog(t *testing.T) {
	t.Parallel()

	var seenAuth string
	var seenAccountID string
	var seenOriginator string
	var seenClientVersion string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/backend-api/codex/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		seenAccountID = r.Header.Get("Chatgpt-Account-Id")
		seenOriginator = r.Header.Get("Originator")
		seenClientVersion = r.URL.Query().Get("client_version")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"models": []map[string]any{
				{"slug": "gpt-5-codex"},
				{"id": "gpt-5.4"},
			},
		})
	}))
	defer server.Close()

	models, err := listCodexModelsWithCredentials(context.Background(), rewriteClient(server, t), codexauth.Credentials{
		BaseURL:   "https://chatgpt.com/backend-api/codex",
		Token:     "access-token",
		AccountID: "acct_123",
	})
	if err != nil {
		t.Fatalf("listCodexModelsWithCredentials error: %v", err)
	}
	if seenAuth != "Bearer access-token" {
		t.Fatalf("unexpected auth header: %q", seenAuth)
	}
	if seenClientVersion != codexClientVersion {
		t.Fatalf("unexpected client_version: %q", seenClientVersion)
	}
	if seenAccountID != "acct_123" || seenOriginator != codexOriginator {
		t.Fatalf("unexpected codex headers: account=%q originator=%q", seenAccountID, seenOriginator)
	}
	if !slices.Equal(models, []string{"gpt-5-codex", "gpt-5.4"}) {
		t.Fatalf("unexpected models: %#v", models)
	}
}
