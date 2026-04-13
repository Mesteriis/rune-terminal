package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConversationSnapshotReturnsProviderInfo(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodGet, "/api/v1/agent/conversation", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload struct {
		Conversation struct {
			Provider struct {
				Kind string `json:"kind"`
			} `json:"provider"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.Conversation.Provider.Kind != "stub" {
		t.Fatalf("unexpected provider kind: %q", payload.Conversation.Provider.Kind)
	}
}

func TestSubmitConversationMessagePersistsTranscript(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "hello there",
		"context": map[string]any{
			"workspace_id": "ws-default",
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload struct {
		ProviderError string `json:"provider_error"`
		Conversation  struct {
			Messages []struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"messages"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.ProviderError != "" {
		t.Fatalf("unexpected provider error: %q", payload.ProviderError)
	}
	if len(payload.Conversation.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(payload.Conversation.Messages))
	}
	if payload.Conversation.Messages[0].Role != "user" || payload.Conversation.Messages[1].Role != "assistant" {
		t.Fatalf("unexpected roles: %#v", payload.Conversation.Messages)
	}
}

func TestSubmitConversationMessageRejectsBlankPrompt(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/conversation/messages", map[string]any{
		"prompt": "  ",
	}))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
}
