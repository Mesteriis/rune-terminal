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

func TestListCodexModelsLoadsChatGPTModelCatalog(t *testing.T) {
	t.Parallel()

	var seenAuth string
	var seenAccountID string
	var seenOriginator string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/backend-api/codex/models" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		seenAccountID = r.Header.Get("Chatgpt-Account-Id")
		seenOriginator = r.Header.Get("Originator")
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
	if seenAccountID != "acct_123" || seenOriginator != codexOriginator {
		t.Fatalf("unexpected codex headers: account=%q originator=%q", seenAccountID, seenOriginator)
	}
	if !slices.Equal(models, []string{"gpt-5-codex", "gpt-5.4"}) {
		t.Fatalf("unexpected models: %#v", models)
	}
}
