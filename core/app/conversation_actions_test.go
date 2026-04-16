package app

import (
	"context"
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
