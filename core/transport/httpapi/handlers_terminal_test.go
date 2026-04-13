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

	"github.com/avm/rterm/core/agent"
	"github.com/avm/rterm/core/app"
	"github.com/avm/rterm/core/audit"
	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/terminal"
	"github.com/avm/rterm/core/toolruntime"
)

func TestTerminalSnapshotReturnsBufferedChunks(t *testing.T) {
	t.Parallel()

	process := &httpTestProcess{
		outputCh: make(chan []byte, 2),
	}
	launcher := &httpTestLauncher{process: process}

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
	registry := toolruntime.NewRegistry()
	runtime := &app.Runtime{
		RepoRoot:  "/workspace/repo",
		Terminals: terminal.NewService(launcher),
		Agent:     agentStore,
		Policy:    policyStore,
		Audit:     auditLog,
		Registry:  registry,
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit, runtime.Agent)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "widget-1",
		Shell:      "/bin/zsh",
		WorkingDir: "/workspace/repo",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("hello\n")
	process.outputCh <- []byte("world\n")
	deadline := time.Now().Add(2 * time.Second)
	for {
		snapshot, err := runtime.Terminals.Snapshot("widget-1", 0)
		if err != nil {
			t.Fatalf("Snapshot error: %v", err)
		}
		if len(snapshot.Chunks) >= 2 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for buffered chunks, got %d", len(snapshot.Chunks))
		}
		time.Sleep(10 * time.Millisecond)
	}

	handler := NewHandler(runtime, testAuthToken)
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/terminal/widget-1?from=0", nil)
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var snapshot terminal.Snapshot
	if err := json.Unmarshal(recorder.Body.Bytes(), &snapshot); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if len(snapshot.Chunks) != 2 {
		t.Fatalf("expected 2 chunks, got %d", len(snapshot.Chunks))
	}
	if snapshot.NextSeq != 3 {
		t.Fatalf("expected next seq 3, got %d", snapshot.NextSeq)
	}
}

type httpTestLauncher struct {
	process terminal.Process
}

func (l *httpTestLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}

type httpTestProcess struct {
	outputCh chan []byte
}

func (p *httpTestProcess) PID() int                       { return 1234 }
func (p *httpTestProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *httpTestProcess) Output() <-chan []byte          { return p.outputCh }
func (p *httpTestProcess) Wait() (int, error)             { return 0, nil }
func (p *httpTestProcess) Signal(os.Signal) error         { return nil }
func (p *httpTestProcess) Close() error {
	close(p.outputCh)
	return nil
}
