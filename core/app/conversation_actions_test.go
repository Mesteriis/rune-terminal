package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestSubmitConversationPromptUsesSelectionPromptAndContext(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent store: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/repo")
	if err != nil {
		t.Fatalf("policy store: %v", err)
	}
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("connections: %v", err)
	}

	provider := &recordingConversationProvider{}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), provider)
	if err != nil {
		t.Fatalf("conversation service: %v", err)
	}

	runtime := &Runtime{
		RepoRoot:     "/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
	}

	selection, err := runtime.Agent.Selection()
	if err != nil {
		t.Fatalf("selection: %v", err)
	}

	_, err = runtime.SubmitConversationPrompt(context.Background(), "hello", ConversationContext{
		WorkspaceID:          "ws-default",
		RepoRoot:             "/repo",
		ActiveWidgetID:       "term_boot",
		ActionSource:         "test.ai.submit",
		TargetSession:        "remote",
		TargetConnectionID:   "conn-ssh-prod",
		WidgetContextEnabled: true,
	}, nil)
	if err != nil {
		t.Fatalf("submit prompt: %v", err)
	}

	if !strings.Contains(provider.request.SystemPrompt, selection.EffectivePrompt()) {
		t.Fatalf("expected system prompt to include selection prompt, got %q", provider.request.SystemPrompt)
	}
	if !strings.Contains(provider.request.SystemPrompt, "Active widget: term_boot") {
		t.Fatalf("expected context block in system prompt, got %q", provider.request.SystemPrompt)
	}
	if !strings.Contains(provider.request.SystemPrompt, "Active terminal target: conn-ssh-prod (remote)") {
		t.Fatalf("expected explicit terminal target context in system prompt, got %q", provider.request.SystemPrompt)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].ToolName != "agent.conversation" || !events[0].Success {
		t.Fatalf("unexpected audit event: %#v", events[0])
	}
	if events[0].ActionSource != "test.ai.submit" {
		t.Fatalf("expected action source in audit, got %#v", events[0])
	}
}

func TestSubmitConversationPromptIncludesAttachmentContextInProviderRequest(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	attachmentPath := filepath.Join(tempDir, "notes.txt")
	if err := os.WriteFile(attachmentPath, []byte("attachment content line"), 0o600); err != nil {
		t.Fatalf("write attachment: %v", err)
	}

	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent store: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/repo")
	if err != nil {
		t.Fatalf("policy store: %v", err)
	}
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("connections: %v", err)
	}

	provider := &recordingConversationProvider{}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), provider)
	if err != nil {
		t.Fatalf("conversation service: %v", err)
	}

	runtime := &Runtime{
		RepoRoot:     "/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
	}

	result, err := runtime.SubmitConversationPrompt(context.Background(), "summarize attachment", ConversationContext{
		WorkspaceID: "ws-default",
		RepoRoot:    "/repo",
	}, []conversation.AttachmentReference{
		{
			ID:       "att_test",
			Name:     "notes.txt",
			Path:     attachmentPath,
			MimeType: "text/plain",
		},
	})
	if err != nil {
		t.Fatalf("submit prompt: %v", err)
	}

	if len(provider.request.Messages) == 0 {
		t.Fatalf("expected provider request messages, got %#v", provider.request.Messages)
	}
	lastMessage := provider.request.Messages[len(provider.request.Messages)-1]
	if !strings.Contains(lastMessage.Content, "Attachment context (local references, bounded):") {
		t.Fatalf("expected attachment context in provider prompt, got %q", lastMessage.Content)
	}
	if !strings.Contains(lastMessage.Content, "attachment content line") {
		t.Fatalf("expected attachment excerpt in provider prompt, got %q", lastMessage.Content)
	}
	if !strings.Contains(lastMessage.Content, attachmentPath) {
		t.Fatalf("expected attachment path in provider prompt, got %q", lastMessage.Content)
	}
	if len(result.Snapshot.Messages) == 0 || result.Snapshot.Messages[0].Content != "summarize attachment" {
		t.Fatalf("expected persisted user prompt without synthetic attachment block, got %#v", result.Snapshot.Messages)
	}
}

func TestSubmitConversationPromptResolvesActiveProviderFromBackendConfig(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent store: %v", err)
	}
	created, _, err := agentStore.CreateProvider(agent.CreateProviderInput{
		Kind: agent.ProviderKindOpenAI,
		OpenAI: &agent.CreateOpenAIProviderInput{
			BaseURL: "https://placeholder.invalid/v1",
			Model:   "gpt-4o-mini",
			APIKey:  "sk-openai-test",
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}
	if err := agentStore.SetActiveProvider(created.ID); err != nil {
		t.Fatalf("SetActiveProvider error: %v", err)
	}

	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/repo")
	if err != nil {
		t.Fatalf("policy store: %v", err)
	}
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("connections: %v", err)
	}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), &recordingConversationProvider{})
	if err != nil {
		t.Fatalf("conversation service: %v", err)
	}

	var seenAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		seenAuth = r.Header.Get("Authorization")
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if payload["stream"] == true {
			t.Fatalf("expected non-stream request, got %#v", payload)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"model": "gpt-4o-mini",
			"choices": []map[string]any{
				{"message": map[string]any{"content": "openai reply"}},
			},
		})
	}))
	defer server.Close()

	runtime := &Runtime{
		RepoRoot:     "/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
		ConversationProviderFactory: func(record agent.ProviderRecord) (conversation.Provider, error) {
			if record.OpenAI == nil {
				t.Fatalf("expected openai record, got %#v", record)
			}
			return conversation.NewOpenAIProvider(conversation.OpenAIProviderConfig{
				BaseURL: server.URL,
				Model:   record.OpenAI.Model,
				APIKey:  record.OpenAI.APIKeySecret,
			}), nil
		},
	}

	result, err := runtime.SubmitConversationPrompt(context.Background(), "hello", ConversationContext{
		WorkspaceID: "ws-default",
		RepoRoot:    "/repo",
	}, nil)
	if err != nil {
		t.Fatalf("SubmitConversationPrompt error: %v", err)
	}
	if seenAuth != "Bearer sk-openai-test" {
		t.Fatalf("unexpected auth header: %q", seenAuth)
	}
	if result.ProviderInfo.Kind != "openai" {
		t.Fatalf("expected openai provider info, got %#v", result.ProviderInfo)
	}
	if !slices.ContainsFunc(result.Snapshot.Messages, func(message conversation.Message) bool {
		return message.Role == conversation.RoleAssistant && message.Provider == "openai"
	}) {
		t.Fatalf("expected openai assistant message, got %#v", result.Snapshot.Messages)
	}
}

func TestStreamConversationPromptUsesConfiguredActiveProvider(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent store: %v", err)
	}
	created, _, err := agentStore.CreateProvider(agent.CreateProviderInput{
		Kind: agent.ProviderKindOpenAI,
		OpenAI: &agent.CreateOpenAIProviderInput{
			BaseURL: "https://placeholder.invalid/v1",
			Model:   "gpt-4o-mini",
			APIKey:  "sk-openai-test",
		},
	})
	if err != nil {
		t.Fatalf("CreateProvider error: %v", err)
	}
	if err := agentStore.SetActiveProvider(created.ID); err != nil {
		t.Fatalf("SetActiveProvider error: %v", err)
	}

	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("audit log: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/repo")
	if err != nil {
		t.Fatalf("policy store: %v", err)
	}
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("connections: %v", err)
	}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), &recordingConversationProvider{})
	if err != nil {
		t.Fatalf("conversation service: %v", err)
	}

	var seenStream bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		var payload struct {
			Stream bool `json:"stream"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		seenStream = payload.Stream
		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Fatal("expected flusher")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		for _, line := range []string{
			`data: {"model":"gpt-4o-mini","choices":[{"delta":{"content":"hello "}}]}`,
			``,
			`data: {"model":"gpt-4o-mini","choices":[{"delta":{"content":"world"}}]}`,
			``,
			`data: [DONE]`,
			``,
		} {
			if _, err := w.Write([]byte(line + "\n")); err != nil {
				t.Fatalf("write chunk: %v", err)
			}
			flusher.Flush()
		}
	}))
	defer server.Close()

	runtime := &Runtime{
		RepoRoot:     "/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
		ConversationProviderFactory: func(record agent.ProviderRecord) (conversation.Provider, error) {
			return conversation.NewOpenAIProvider(conversation.OpenAIProviderConfig{
				BaseURL: server.URL,
				Model:   record.OpenAI.Model,
				APIKey:  record.OpenAI.APIKeySecret,
			}), nil
		},
	}

	var events []conversation.StreamEvent
	result, err := runtime.StreamConversationPrompt(context.Background(), "hello", ConversationContext{
		WorkspaceID: "ws-default",
		RepoRoot:    "/repo",
	}, nil, func(event conversation.StreamEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil {
		t.Fatalf("StreamConversationPrompt error: %v", err)
	}
	if !seenStream {
		t.Fatal("expected streaming request")
	}
	if len(events) != 4 || events[0].Type != conversation.StreamEventMessageStart || events[1].Type != conversation.StreamEventTextDelta || events[3].Type != conversation.StreamEventMessageComplete {
		t.Fatalf("unexpected events: %#v", events)
	}
	if result.ProviderInfo.Kind != "openai" || result.Assistant.Content != "hello world" {
		t.Fatalf("unexpected stream result: %#v", result)
	}
}

type recordingConversationProvider struct {
	request conversation.CompletionRequest
}

func (p *recordingConversationProvider) Info() conversation.ProviderInfo {
	return conversation.ProviderInfo{
		Kind:      "stub",
		BaseURL:   "http://stub",
		Model:     "stub-model",
		Streaming: false,
	}
}

func (p *recordingConversationProvider) Complete(_ context.Context, request conversation.CompletionRequest) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	p.request = request
	info := p.Info()
	return conversation.CompletionResult{
		Content: "assistant reply",
		Model:   info.Model,
	}, info, nil
}

func (p *recordingConversationProvider) CompleteStream(
	_ context.Context,
	request conversation.CompletionRequest,
	onTextDelta func(string) error,
) (conversation.CompletionResult, conversation.ProviderInfo, error) {
	p.request = request
	if onTextDelta != nil {
		if err := onTextDelta("assistant reply"); err != nil {
			return conversation.CompletionResult{}, p.Info(), err
		}
	}
	info := p.Info()
	return conversation.CompletionResult{
		Content: "assistant reply",
		Model:   info.Model,
	}, info, nil
}
