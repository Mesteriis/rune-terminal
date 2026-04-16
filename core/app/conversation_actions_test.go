package app

import (
	"context"
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
