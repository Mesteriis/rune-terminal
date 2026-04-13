package app

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestExplainTerminalCommandAppendsAssistantSummary(t *testing.T) {
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

	process := &stubTerminalProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	terminalService := terminal.NewService(stubTerminalLauncher{process: process})
	if _, err := terminalService.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term_boot",
		WorkingDir: "/repo",
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	}); err != nil {
		t.Fatalf("start session: %v", err)
	}
	process.outputCh <- []byte("remote-e2e-ok\n")
	deadline := time.Now().Add(250 * time.Millisecond)
	for {
		snapshot, snapErr := terminalService.Snapshot("term_boot", 0)
		if snapErr == nil && len(snapshot.Chunks) > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for terminal snapshot chunk")
		}
		time.Sleep(10 * time.Millisecond)
	}

	runtime := &Runtime{
		RepoRoot:     "/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminalService,
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
	}

	result, err := runtime.ExplainTerminalCommand(context.Background(), ExplainTerminalCommandRequest{
		Prompt:   "/run echo remote-e2e-ok",
		Command:  "echo remote-e2e-ok",
		WidgetID: "term_boot",
		FromSeq:  0,
	}, ConversationContext{
		WorkspaceID:          "ws-default",
		RepoRoot:             "/repo",
		ActiveWidgetID:       "term_boot",
		WidgetContextEnabled: true,
	})
	if err != nil {
		t.Fatalf("explain terminal command: %v", err)
	}
	if result.ProviderError != "" {
		t.Fatalf("unexpected provider error: %q", result.ProviderError)
	}
	if len(result.Snapshot.Messages) != 1 {
		t.Fatalf("expected 1 persisted assistant message, got %d", len(result.Snapshot.Messages))
	}
	if len(provider.request.Messages) == 0 {
		t.Fatalf("expected provider request messages")
	}
	lastPrompt := provider.request.Messages[len(provider.request.Messages)-1].Content
	if !strings.Contains(lastPrompt, "echo remote-e2e-ok") {
		t.Fatalf("expected provider prompt to include command, got %q", lastPrompt)
	}
	if !strings.Contains(lastPrompt, "remote-e2e-ok") {
		t.Fatalf("expected provider prompt to include output, got %q", lastPrompt)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].ToolName != "agent.terminal_command" || !events[0].Success {
		t.Fatalf("unexpected audit event: %#v", events[0])
	}
}

type stubTerminalProcess struct {
	outputCh chan []byte
	waitCh   chan struct{}
}

func (p *stubTerminalProcess) PID() int                       { return 42 }
func (p *stubTerminalProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *stubTerminalProcess) Output() <-chan []byte          { return p.outputCh }
func (p *stubTerminalProcess) Wait() (int, error)             { <-p.waitCh; return 0, nil }
func (p *stubTerminalProcess) Signal(os.Signal) error         { return nil }
func (p *stubTerminalProcess) Close() error                   { close(p.waitCh); return nil }

type stubTerminalLauncher struct {
	process terminal.Process
}

func (l stubTerminalLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}
