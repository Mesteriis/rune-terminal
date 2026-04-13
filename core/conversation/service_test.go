package conversation

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

func TestServiceSubmitPersistsConversation(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), stubProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub", Model: "stub-model"},
		result: CompletionResult{
			Content: "hello from assistant",
			Model:   "stub-model",
		},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	result, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt: "system prompt",
		Prompt:       "hello",
	})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if result.ProviderError != "" {
		t.Fatalf("unexpected provider error: %s", result.ProviderError)
	}
	if len(result.Snapshot.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(result.Snapshot.Messages))
	}
	if result.Snapshot.Messages[0].Role != RoleUser {
		t.Fatalf("expected user role, got %s", result.Snapshot.Messages[0].Role)
	}
	if result.Snapshot.Messages[1].Role != RoleAssistant {
		t.Fatalf("expected assistant role, got %s", result.Snapshot.Messages[1].Role)
	}
	if result.Snapshot.Messages[1].Content != "hello from assistant" {
		t.Fatalf("unexpected assistant content: %q", result.Snapshot.Messages[1].Content)
	}
}

func TestServiceSubmitRecordsProviderFailureInTranscript(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), stubProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub"},
		err:  errors.New("provider unavailable"),
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	result, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt: "system prompt",
		Prompt:       "hello",
	})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if result.ProviderError == "" {
		t.Fatalf("expected provider error to be recorded")
	}
	if result.Assistant.Status != StatusError {
		t.Fatalf("expected assistant error status, got %s", result.Assistant.Status)
	}
	if result.Assistant.Content != "provider unavailable" {
		t.Fatalf("unexpected assistant error content: %q", result.Assistant.Content)
	}
}

func TestServiceSubmitRejectsBlankPrompt(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), stubProvider{})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	if _, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt: "system prompt",
		Prompt:       "   ",
	}); !errors.Is(err, ErrInvalidPrompt) {
		t.Fatalf("expected invalid prompt error, got %v", err)
	}
}

func TestAppendAssistantPromptAppendsOnlyAssistantMessage(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), stubProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub", Model: "stub-model"},
		result: CompletionResult{
			Content: "summary reply",
			Model:   "stub-model",
		},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	if _, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt: "system prompt",
		Prompt:       "hello",
	}); err != nil {
		t.Fatalf("submit: %v", err)
	}

	result, err := service.AppendAssistantPrompt(context.Background(), AssistantPromptRequest{
		SystemPrompt: "system prompt",
		Prompt:       "Summarize the last command result.",
	})
	if err != nil {
		t.Fatalf("append assistant prompt: %v", err)
	}
	if len(result.Snapshot.Messages) != 3 {
		t.Fatalf("expected 3 persisted messages, got %d", len(result.Snapshot.Messages))
	}
	if result.Snapshot.Messages[2].Role != RoleAssistant {
		t.Fatalf("expected appended assistant role, got %s", result.Snapshot.Messages[2].Role)
	}
	if result.Snapshot.Messages[2].Content != "summary reply" {
		t.Fatalf("unexpected appended assistant content: %q", result.Snapshot.Messages[2].Content)
	}
}

type stubProvider struct {
	info   ProviderInfo
	result CompletionResult
	err    error
}

func (p stubProvider) Info() ProviderInfo {
	return p.info
}

func (p stubProvider) Complete(context.Context, CompletionRequest) (CompletionResult, ProviderInfo, error) {
	return p.result, p.info, p.err
}
