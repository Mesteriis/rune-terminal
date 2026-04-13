package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
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

func TestExplainTerminalCommandReturnsConversationSnapshot(t *testing.T) {
	t.Parallel()

	handler := newExplainCommandHandler(t)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPost, "/api/v1/agent/terminal-commands/explain", map[string]any{
		"prompt":    "/run echo httpapi-smoke",
		"command":   "echo httpapi-smoke",
		"widget_id": "term_boot",
		"from_seq":  0,
		"context": map[string]any{
			"workspace_id":           "ws-default",
			"repo_root":              "/workspace/repo",
			"active_widget_id":       "term_boot",
			"widget_context_enabled": true,
		},
	}))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		OutputExcerpt string `json:"output_excerpt"`
		Conversation  struct {
			Messages []struct {
				Role string `json:"role"`
			} `json:"messages"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if payload.OutputExcerpt == "" {
		t.Fatal("expected output excerpt")
	}
	if len(payload.Conversation.Messages) != 1 || payload.Conversation.Messages[0].Role != "assistant" {
		t.Fatalf("unexpected conversation messages: %#v", payload.Conversation.Messages)
	}
}

func newExplainCommandHandler(t *testing.T) http.Handler {
	t.Helper()

	tempDir := t.TempDir()
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), testConversationProvider{})
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}
	process := &handlerTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	terminalService := terminal.NewService(handlerTestLauncher{process: process})
	if _, err := terminalService.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term_boot",
		WorkingDir: "/workspace/repo",
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	process.outputCh <- []byte("httpapi-smoke\n")
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

	runtime := &app.Runtime{
		RepoRoot:     "/workspace/repo",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminalService,
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
		Registry:     toolruntime.NewRegistry(),
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit, runtime.Agent)
	return NewHandler(runtime, testAuthToken)
}

type handlerTestProcess struct {
	outputCh chan []byte
	waitCh   chan struct{}
}

func (p *handlerTestProcess) PID() int                       { return 42 }
func (p *handlerTestProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *handlerTestProcess) Output() <-chan []byte          { return p.outputCh }
func (p *handlerTestProcess) Wait() (int, error)             { <-p.waitCh; return 0, nil }
func (p *handlerTestProcess) Signal(os.Signal) error         { return nil }
func (p *handlerTestProcess) Close() error                   { close(p.waitCh); return nil }

type handlerTestLauncher struct {
	process terminal.Process
}

func (l handlerTestLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}
