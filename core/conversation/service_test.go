package conversation

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"
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

func TestAppendMessagesPersistsRunChainWithoutProviderCall(t *testing.T) {
	t.Parallel()

	provider := &recordingProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub", Model: "stub-model"},
		result: CompletionResult{
			Content: "unused",
			Model:   "stub-model",
		},
	}
	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), provider)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	snapshot, err := service.AppendMessages([]AppendMessageRequest{
		{
			Role:    RoleUser,
			Content: "/run echo hello",
		},
		{
			Role:    RoleAssistant,
			Content: "Executed `echo hello`.\n\n```text\nhello\n```",
		},
	})
	if err != nil {
		t.Fatalf("append messages: %v", err)
	}

	if len(snapshot.Messages) != 2 {
		t.Fatalf("expected 2 persisted messages, got %d", len(snapshot.Messages))
	}
	if snapshot.Messages[0].Role != RoleUser || snapshot.Messages[1].Role != RoleAssistant {
		t.Fatalf("unexpected roles: %#v", snapshot.Messages)
	}
	if provider.request.Messages != nil {
		t.Fatalf("expected no provider call, got %#v", provider.request.Messages)
	}
}

func TestAppendMessagesRejectsBlankContent(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), stubProvider{})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	if _, err := service.AppendMessages([]AppendMessageRequest{
		{
			Role:    RoleUser,
			Content: "   ",
		},
	}); !errors.Is(err, ErrInvalidMessage) {
		t.Fatalf("expected invalid message error, got %v", err)
	}
}

func TestServiceSubmitPrunesProviderHistoryByMessageCount(t *testing.T) {
	t.Parallel()

	provider := &recordingProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub", Model: "stub-model"},
		result: CompletionResult{
			Content: "bounded reply",
			Model:   "stub-model",
		},
	}
	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), provider)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}
	service.budget = historyBudget{MaxMessages: 3, MaxChars: 1024}
	service.state.Messages = seededMessages(
		ChatMessage{Role: RoleUser, Content: "old-1"},
		ChatMessage{Role: RoleAssistant, Content: "old-2"},
		ChatMessage{Role: RoleUser, Content: "old-3"},
		ChatMessage{Role: RoleAssistant, Content: "old-4"},
	)

	result, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt: "system prompt",
		Prompt:       "latest",
	})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}

	if len(provider.request.Messages) != 3 {
		t.Fatalf("expected 3 provider messages, got %d", len(provider.request.Messages))
	}
	if provider.request.Messages[0].Content != "old-3" || provider.request.Messages[1].Content != "old-4" || provider.request.Messages[2].Content != "latest" {
		t.Fatalf("unexpected provider messages: %#v", provider.request.Messages)
	}
	if len(result.Snapshot.Messages) != 6 {
		t.Fatalf("expected full transcript to persist, got %d messages", len(result.Snapshot.Messages))
	}
}

func TestServiceSubmitPrunesProviderHistoryByCharacterBudget(t *testing.T) {
	t.Parallel()

	provider := &recordingProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub", Model: "stub-model"},
		result: CompletionResult{
			Content: "bounded reply",
			Model:   "stub-model",
		},
	}
	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), provider)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}
	service.budget = historyBudget{MaxMessages: 10, MaxChars: 12}
	service.state.Messages = seededMessages(
		ChatMessage{Role: RoleUser, Content: "1234"},
		ChatMessage{Role: RoleAssistant, Content: "5678"},
		ChatMessage{Role: RoleUser, Content: "9012"},
	)

	if _, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt: "system prompt",
		Prompt:       "abcd",
	}); err != nil {
		t.Fatalf("submit: %v", err)
	}

	if len(provider.request.Messages) != 3 {
		t.Fatalf("expected 3 provider messages, got %d", len(provider.request.Messages))
	}
	if provider.request.Messages[0].Content != "5678" || provider.request.Messages[1].Content != "9012" || provider.request.Messages[2].Content != "abcd" {
		t.Fatalf("unexpected provider messages: %#v", provider.request.Messages)
	}
}

func TestServiceSubmitUsesProviderPromptOverrideWithoutChangingPersistedUserMessage(t *testing.T) {
	t.Parallel()

	provider := &recordingProvider{
		info: ProviderInfo{Kind: "stub", BaseURL: "http://stub", Model: "stub-model"},
		result: CompletionResult{
			Content: "bounded reply",
			Model:   "stub-model",
		},
	}
	service, err := NewService(filepath.Join(t.TempDir(), "conversation.json"), provider)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	result, err := service.Submit(context.Background(), SubmitRequest{
		SystemPrompt:   "system prompt",
		Prompt:         "original prompt",
		ProviderPrompt: "original prompt\n\nAttachment context block",
	})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if len(provider.request.Messages) == 0 {
		t.Fatalf("expected provider request messages, got %#v", provider.request.Messages)
	}
	last := provider.request.Messages[len(provider.request.Messages)-1]
	if last.Content != "original prompt\n\nAttachment context block" {
		t.Fatalf("unexpected provider prompt: %q", last.Content)
	}
	if len(result.Snapshot.Messages) == 0 || result.Snapshot.Messages[0].Content != "original prompt" {
		t.Fatalf("unexpected persisted user content: %#v", result.Snapshot.Messages)
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

func (p stubProvider) CompleteStream(
	_ context.Context,
	_ CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	if onTextDelta != nil && p.result.Content != "" {
		if err := onTextDelta(p.result.Content); err != nil {
			return CompletionResult{}, p.info, err
		}
	}
	return p.result, p.info, p.err
}

type recordingProvider struct {
	info    ProviderInfo
	result  CompletionResult
	err     error
	request CompletionRequest
}

func (p *recordingProvider) Info() ProviderInfo {
	return p.info
}

func (p *recordingProvider) Complete(_ context.Context, request CompletionRequest) (CompletionResult, ProviderInfo, error) {
	p.request = request
	return p.result, p.info, p.err
}

func (p *recordingProvider) CompleteStream(
	_ context.Context,
	request CompletionRequest,
	onTextDelta func(string) error,
) (CompletionResult, ProviderInfo, error) {
	p.request = request
	if onTextDelta != nil && p.result.Content != "" {
		if err := onTextDelta(p.result.Content); err != nil {
			return CompletionResult{}, p.info, err
		}
	}
	return p.result, p.info, p.err
}

func seededMessages(messages ...ChatMessage) []Message {
	seeded := make([]Message, 0, len(messages))
	now := time.Now().UTC()
	for index, message := range messages {
		seeded = append(seeded, Message{
			ID:        "seeded",
			Role:      message.Role,
			Content:   message.Content,
			Status:    StatusComplete,
			CreatedAt: now.Add(time.Duration(index) * time.Second),
		})
	}
	return seeded
}
