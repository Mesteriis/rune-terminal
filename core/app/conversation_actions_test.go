package app

import (
	"context"
	"errors"
	"os"
	"path/filepath"
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

	_, err = runtime.SubmitConversationPrompt(context.Background(), "hello", "", ConversationContext{
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
	if len(events[0].AffectedWidgets) != 1 || events[0].AffectedWidgets[0] != "term_boot" {
		t.Fatalf("expected active widget in audit, got %#v", events[0].AffectedWidgets)
	}
}

func TestSubmitConversationPromptUsesExplicitContextWidgetIDs(t *testing.T) {
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

	_, err = runtime.SubmitConversationPrompt(context.Background(), "hello", "", ConversationContext{
		WorkspaceID:          "ws-default",
		RepoRoot:             "/repo",
		ActiveWidgetID:       "term-main",
		WidgetIDs:            []string{"term-side", "", "term-main", "term-side"},
		ActionSource:         "test.ai.context.widgets",
		WidgetContextEnabled: true,
	}, nil)
	if err != nil {
		t.Fatalf("submit prompt: %v", err)
	}

	if !strings.Contains(provider.request.SystemPrompt, "Context widgets:") {
		t.Fatalf("expected context widget block in system prompt, got %q", provider.request.SystemPrompt)
	}
	if !strings.Contains(provider.request.SystemPrompt, "Ops Shell (term-side) · terminal · local") {
		t.Fatalf("expected explicit term-side context widget, got %q", provider.request.SystemPrompt)
	}
	if !strings.Contains(provider.request.SystemPrompt, "Main Shell (term-main) · terminal · local") {
		t.Fatalf("expected explicit term-main context widget, got %q", provider.request.SystemPrompt)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if len(events[0].AffectedWidgets) != 2 ||
		events[0].AffectedWidgets[0] != "term-side" ||
		events[0].AffectedWidgets[1] != "term-main" {
		t.Fatalf("expected explicit widget list in audit, got %#v", events[0].AffectedWidgets)
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

	result, err := runtime.SubmitConversationPrompt(context.Background(), "summarize attachment", "", ConversationContext{
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
		Kind: agent.ProviderKindClaude,
		Claude: &agent.CreateClaudeProviderInput{
			Command: "claude",
			Model:   "sonnet",
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

	recordingProvider := &recordingConversationProvider{
		info: conversation.ProviderInfo{Kind: "claude", Model: "sonnet"},
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
		ConversationProviderFactory: func(record agent.ProviderRecord) (conversation.Provider, error) {
			if record.Claude == nil {
				t.Fatalf("expected claude record, got %#v", record)
			}
			return recordingProvider, nil
		},
	}

	result, err := runtime.SubmitConversationPrompt(context.Background(), "hello", "", ConversationContext{
		WorkspaceID: "ws-default",
		RepoRoot:    "/repo",
	}, nil)
	if err != nil {
		t.Fatalf("SubmitConversationPrompt error: %v", err)
	}
	if result.ProviderInfo.Kind != "claude" {
		t.Fatalf("expected claude provider info, got %#v", result.ProviderInfo)
	}
	if recordingProvider.request.Messages[len(recordingProvider.request.Messages)-1].Content != "hello" {
		t.Fatalf("expected provider request through configured active provider, got %#v", recordingProvider.request)
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
		Kind: agent.ProviderKindCodex,
		Codex: &agent.CreateCodexProviderInput{
			Command: "codex",
			Model:   "gpt-5-codex",
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

	recordingProvider := &recordingConversationProvider{
		info: conversation.ProviderInfo{Kind: "codex", Model: "gpt-5-codex"},
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
		ConversationProviderFactory: func(record agent.ProviderRecord) (conversation.Provider, error) {
			if record.Codex == nil {
				t.Fatalf("expected codex record, got %#v", record)
			}
			return recordingProvider, nil
		},
	}

	var events []conversation.StreamEvent
	result, err := runtime.StreamConversationPrompt(context.Background(), "hello", "", ConversationContext{
		WorkspaceID: "ws-default",
		RepoRoot:    "/repo",
	}, nil, func(event conversation.StreamEvent) error {
		events = append(events, event)
		return nil
	})
	if err != nil {
		t.Fatalf("StreamConversationPrompt error: %v", err)
	}
	if len(events) != 3 || events[0].Type != conversation.StreamEventMessageStart || events[1].Type != conversation.StreamEventTextDelta || events[2].Type != conversation.StreamEventMessageComplete {
		t.Fatalf("unexpected events: %#v", events)
	}
	if result.ProviderInfo.Kind != "codex" || result.Assistant.Content != "assistant reply" {
		t.Fatalf("unexpected stream result: %#v", result)
	}
}

func TestSubmitConversationPromptAppliesSelectedModelOverride(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent store: %v", err)
	}
	created, _, err := agentStore.CreateProvider(agent.CreateProviderInput{
		Kind: agent.ProviderKindCodex,
		Codex: &agent.CreateCodexProviderInput{
			Command:    "codex",
			Model:      "gpt-5-codex",
			ChatModels: []string{"gpt-5-codex", "gpt-5.4"},
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

	recordingProvider := &recordingConversationProvider{}
	var seenConfiguredModel string
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
			seenConfiguredModel = record.Codex.Model
			return recordingProvider, nil
		},
	}

	if _, err := runtime.SubmitConversationPrompt(
		context.Background(),
		"hello",
		"gpt-5.4",
		ConversationContext{WorkspaceID: "ws-default", RepoRoot: "/repo"},
		nil,
	); err != nil {
		t.Fatalf("SubmitConversationPrompt error: %v", err)
	}

	if seenConfiguredModel != "gpt-5.4" {
		t.Fatalf("expected selected model in provider record, got %q", seenConfiguredModel)
	}
	if recordingProvider.request.Model != "gpt-5.4" {
		t.Fatalf("expected selected model in provider request, got %#v", recordingProvider.request)
	}
}

func TestSubmitConversationPromptRejectsUnavailableSelectedModel(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent store: %v", err)
	}
	created, _, err := agentStore.CreateProvider(agent.CreateProviderInput{
		Kind: agent.ProviderKindCodex,
		Codex: &agent.CreateCodexProviderInput{
			Command:    "codex",
			Model:      "gpt-5-codex",
			ChatModels: []string{"gpt-5-codex"},
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
			return &recordingConversationProvider{}, nil
		},
	}

	_, err = runtime.SubmitConversationPrompt(
		context.Background(),
		"hello",
		"gpt-5.4",
		ConversationContext{WorkspaceID: "ws-default", RepoRoot: "/repo"},
		nil,
	)
	if !errors.Is(err, ErrConversationModelUnavailable) {
		t.Fatalf("expected ErrConversationModelUnavailable, got %v", err)
	}
}

type recordingConversationProvider struct {
	request conversation.CompletionRequest
	info    conversation.ProviderInfo
}

func (p *recordingConversationProvider) Info() conversation.ProviderInfo {
	if p.info.Kind != "" {
		return p.info
	}
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
