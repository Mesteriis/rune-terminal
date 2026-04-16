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
	"github.com/Mesteriis/rune-terminal/core/execution"
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
	executionStore, err := execution.NewService(filepath.Join(tempDir, "execution-blocks.json"))
	if err != nil {
		t.Fatalf("execution service: %v", err)
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
		Execution:    executionStore,
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
		ActionSource:         "test.terminal.explain",
		WidgetContextEnabled: true,
	})
	if err != nil {
		t.Fatalf("explain terminal command: %v", err)
	}
	if result.ProviderError != "" {
		t.Fatalf("unexpected provider error: %q", result.ProviderError)
	}
	if len(result.Snapshot.Messages) != 3 {
		t.Fatalf("expected 3 persisted run-chain messages, got %d", len(result.Snapshot.Messages))
	}
	if result.ExecutionBlockID == "" {
		t.Fatal("expected execution block id")
	}
	if result.Snapshot.Messages[0].Role != conversation.RoleUser {
		t.Fatalf("expected persisted user run prompt, got %#v", result.Snapshot.Messages[0])
	}
	if result.Snapshot.Messages[1].Role != conversation.RoleAssistant {
		t.Fatalf("expected persisted execution result message, got %#v", result.Snapshot.Messages[1])
	}
	if result.Snapshot.Messages[2].Role != conversation.RoleAssistant {
		t.Fatalf("expected persisted assistant explanation, got %#v", result.Snapshot.Messages[2])
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
	if events[0].ApprovalUsed {
		t.Fatalf("expected approval_used=false without approved execution, got %#v", events[0])
	}
	if events[0].TargetSession != "local" || events[0].TargetConnectionID != "local" {
		t.Fatalf("expected local target session audit fields, got %#v", events[0])
	}
	if events[0].ActionSource != "test.terminal.explain" {
		t.Fatalf("expected action source in explain audit, got %#v", events[0])
	}
}

func TestExplainTerminalCommandDerivesApprovalUsedFromMatchingToolAudit(t *testing.T) {
	t.Parallel()

	runtime := newExplainCommandTestRuntime(t, "approval-derived\n")
	if err := runtime.Audit.Append(audit.Event{
		ToolName:        "term.send_input",
		Summary:         "send input to term_boot: echo approval-derived",
		WorkspaceID:     "ws-default",
		AffectedWidgets: []string{"term_boot"},
		ApprovalUsed:    true,
		Success:         true,
	}); err != nil {
		t.Fatalf("append audit event: %v", err)
	}

	if _, err := runtime.ExplainTerminalCommand(context.Background(), ExplainTerminalCommandRequest{
		Prompt:   "/run echo approval-derived",
		Command:  "echo approval-derived",
		WidgetID: "term_boot",
		FromSeq:  0,
	}, ConversationContext{
		WorkspaceID:          "ws-default",
		RepoRoot:             "/repo",
		ActiveWidgetID:       "term_boot",
		WidgetContextEnabled: true,
	}); err != nil {
		t.Fatalf("explain terminal command: %v", err)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 audit events, got %d", len(events))
	}
	if events[1].ToolName != "agent.terminal_command" || !events[1].Success {
		t.Fatalf("unexpected explain audit event: %#v", events[1])
	}
	if !events[1].ApprovalUsed {
		t.Fatalf("expected explain audit to derive approval_used=true, got %#v", events[1])
	}
	if events[1].TargetSession != "local" || events[1].TargetConnectionID != "local" {
		t.Fatalf("expected local target session audit fields, got %#v", events[1])
	}
}

func TestExplainTerminalCommandUsesExplicitCommandAuditEventID(t *testing.T) {
	t.Parallel()

	runtime := newExplainCommandTestRuntime(t, "identity-hardened\n")
	if err := runtime.Audit.Append(audit.Event{
		ID:              "audit_selected",
		ToolName:        "term.send_input",
		Summary:         "send input to term_boot: echo identity-hardened",
		WorkspaceID:     "ws-default",
		AffectedWidgets: []string{"term_boot"},
		ApprovalUsed:    true,
		Success:         true,
	}); err != nil {
		t.Fatalf("append selected audit event: %v", err)
	}
	if err := runtime.Audit.Append(audit.Event{
		ID:              "audit_latest",
		ToolName:        "term.send_input",
		Summary:         "send input to term_boot: echo identity-hardened",
		WorkspaceID:     "ws-default",
		AffectedWidgets: []string{"term_boot"},
		ApprovalUsed:    false,
		Success:         true,
	}); err != nil {
		t.Fatalf("append latest audit event: %v", err)
	}

	result, err := runtime.ExplainTerminalCommand(context.Background(), ExplainTerminalCommandRequest{
		Prompt:              "/run echo identity-hardened",
		Command:             "echo identity-hardened",
		WidgetID:            "term_boot",
		FromSeq:             0,
		CommandAuditEventID: "audit_selected",
	}, ConversationContext{
		WorkspaceID:          "ws-default",
		RepoRoot:             "/repo",
		ActiveWidgetID:       "term_boot",
		WidgetContextEnabled: true,
	})
	if err != nil {
		t.Fatalf("explain terminal command: %v", err)
	}
	if result.CommandAuditEventID != "audit_selected" {
		t.Fatalf("expected explicit command audit id, got %q", result.CommandAuditEventID)
	}

	events, err := runtime.Audit.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("expected 3 audit events, got %d", len(events))
	}
	if events[2].ToolName != "agent.terminal_command" || !events[2].Success {
		t.Fatalf("unexpected explain audit event: %#v", events[2])
	}
	if !events[2].ApprovalUsed {
		t.Fatalf("expected explain audit approval_used=true from explicit command identity, got %#v", events[2])
	}
}

func TestSummarizeTerminalOutputSanitizesPromptNoise(t *testing.T) {
	t.Parallel()

	chunks := []terminal.OutputChunk{
		{Seq: 15, Data: "\u001b[10D\u001b[32me\u001b[32mc\u001b[32mh\u001b[32mo\u001b[39m\u001b[6C"},
		{Seq: 16, Data: "\u001b[?2004l\r\r\n"},
		{Seq: 17, Data: "hello\r\n"},
		{Seq: 18, Data: "\u001b[1m\u001b[7m%\u001b[27m\u001b[1m\u001b[0m                                                                                                                       \r \r"},
		{Seq: 19, Data: "\r\u001b[0m\u001b[27m\u001b[24m\u001b[J\r\n\u001b[1;36m╭─\u001b[34mruna-terminal\u001b[0m on \u001b[1;35m main\u001b[0m\r\n\u001b[1;36m╰─\u001b[32m➜\u001b[0m \u001b[K\u001b[?2004h"},
	}

	if got := summarizeTerminalOutput("echo hello", chunks); got != "hello" {
		t.Fatalf("unexpected sanitized output: %q", got)
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

func newExplainCommandTestRuntime(t *testing.T, terminalOutput string) *Runtime {
	t.Helper()

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
	executionStore, err := execution.NewService(filepath.Join(tempDir, "execution-blocks.json"))
	if err != nil {
		t.Fatalf("execution service: %v", err)
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
	process.outputCh <- []byte(terminalOutput)
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

	return &Runtime{
		RepoRoot:     "/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminalService,
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Execution:    executionStore,
		Policy:       policyStore,
		Audit:        auditLog,
	}
}
