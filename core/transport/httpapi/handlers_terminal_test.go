package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func TestTerminalSnapshotReturnsBufferedChunks(t *testing.T) {
	t.Parallel()

	process := &httpTestProcess{
		outputCh: make(chan []byte, 2),
		waitCh:   make(chan struct{}),
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
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

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

func TestWriteTerminalErrorMapsConnectionNotFoundToNotFound(t *testing.T) {
	t.Parallel()

	recorder := httptest.NewRecorder()
	writeTerminalError(recorder, fmt.Errorf("%w: conn-missing", connections.ErrConnectionNotFound))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if payload.Error.Code != "connection_not_found" {
		t.Fatalf("expected error code connection_not_found, got %q", payload.Error.Code)
	}
}

func TestTerminalDiagnosticsReturnsNormalizedIssueAndOutput(t *testing.T) {
	t.Parallel()

	process := &httpTestProcess{
		outputCh: make(chan []byte, 2),
		waitCh:   make(chan struct{}),
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
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "widget-1",
		Shell:      "/bin/zsh",
		WorkingDir: "/workspace/repo",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("ls /definitely-missing\n")
	process.outputCh <- []byte("ls: /definitely-missing: No such file or directory\n")
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
	req := httptest.NewRequest(http.MethodGet, "/api/v1/terminal/widget-1/diagnostics", nil)
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var diagnostics app.TerminalDiagnosticsResult
	if err := json.Unmarshal(recorder.Body.Bytes(), &diagnostics); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if diagnostics.WidgetID != "widget-1" {
		t.Fatalf("expected widget-1, got %q", diagnostics.WidgetID)
	}
	if diagnostics.SessionState != terminal.StatusRunning {
		t.Fatalf("expected running status, got %q", diagnostics.SessionState)
	}
	if diagnostics.IssueSummary == "" {
		t.Fatalf("expected issue summary, got empty result")
	}
	if !strings.Contains(diagnostics.OutputExcerpt, "No such file or directory") {
		t.Fatalf("expected normalized output excerpt, got %q", diagnostics.OutputExcerpt)
	}
	if strings.Contains(diagnostics.OutputExcerpt, "ls /definitely-missing") {
		t.Fatalf("expected command echo to be trimmed from excerpt, got %q", diagnostics.OutputExcerpt)
	}
}

func TestTerminalStreamReplaysBufferedChunksAndKeepsLiveSubscription(t *testing.T) {
	t.Parallel()

	process := &httpTestProcess{
		outputCh: make(chan []byte, 4),
		waitCh:   make(chan struct{}),
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
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "widget-1",
		Shell:      "/bin/zsh",
		WorkingDir: "/workspace/repo",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("hello\n")
	deadline := time.Now().Add(2 * time.Second)
	for {
		snapshot, err := runtime.Terminals.Snapshot("widget-1", 0)
		if err != nil {
			t.Fatalf("Snapshot error: %v", err)
		}
		if len(snapshot.Chunks) >= 1 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for buffered chunks, got %d", len(snapshot.Chunks))
		}
		time.Sleep(10 * time.Millisecond)
	}

	handler := NewHandler(runtime, testAuthToken)
	server := httptest.NewServer(handler)
	defer server.Close()

	req, err := http.NewRequest(http.MethodGet, server.URL+"/api/v1/terminal/widget-1/stream?from=0", nil)
	if err != nil {
		t.Fatalf("NewRequest error: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Do error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	process.outputCh <- []byte("world\n")

	reader := resp.Body
	chunks := make([]terminal.OutputChunk, 0, 2)
	var buffer strings.Builder
	readDeadline := time.Now().Add(2 * time.Second)
	for len(chunks) < 2 {
		if time.Now().After(readDeadline) {
			t.Fatalf("timed out waiting for stream chunks, raw=%q", buffer.String())
		}
		data := make([]byte, 256)
		n, readErr := reader.Read(data)
		if n > 0 {
			buffer.Write(data[:n])
			text := buffer.String()
			for strings.Contains(text, "\n\n") {
				parts := strings.SplitN(text, "\n\n", 2)
				eventBlock := parts[0]
				text = parts[1]
				if !strings.Contains(eventBlock, "event: output") || !strings.Contains(eventBlock, "data: ") {
					continue
				}
				payloadLine := ""
				for _, line := range strings.Split(eventBlock, "\n") {
					if strings.HasPrefix(line, "data: ") {
						payloadLine = strings.TrimPrefix(line, "data: ")
						break
					}
				}
				if payloadLine == "" {
					continue
				}
				var chunk terminal.OutputChunk
				if err := json.Unmarshal([]byte(payloadLine), &chunk); err != nil {
					t.Fatalf("Unmarshal chunk error: %v", err)
				}
				chunks = append(chunks, chunk)
			}
			buffer.Reset()
			buffer.WriteString(text)
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			t.Fatalf("Read error: %v", readErr)
		}
	}

	if len(chunks) != 2 {
		t.Fatalf("expected 2 streamed chunks, got %#v", chunks)
	}
	if chunks[0].Seq != 1 || chunks[0].Data != "hello\n" {
		t.Fatalf("unexpected buffered stream chunk %#v", chunks[0])
	}
	if chunks[1].Seq != 2 || chunks[1].Data != "world\n" {
		t.Fatalf("unexpected live stream chunk %#v", chunks[1])
	}
}

type httpTestLauncher struct {
	process terminal.Process
}

func (l *httpTestLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}

type httpTestProcess struct {
	closeOnce sync.Once
	outputCh  chan []byte
	signalled bool
	waitCh    chan struct{}
}

func (p *httpTestProcess) PID() int                       { return 1234 }
func (p *httpTestProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *httpTestProcess) Output() <-chan []byte          { return p.outputCh }
func (p *httpTestProcess) Wait() (int, error) {
	<-p.waitCh
	return 0, nil
}
func (p *httpTestProcess) Signal(os.Signal) error {
	p.signalled = true
	return nil
}
func (p *httpTestProcess) Close() error {
	p.closeOnce.Do(func() {
		close(p.waitCh)
		close(p.outputCh)
	})
	return nil
}

func TestTerminalInterruptSignalsProcessAndReturnsCurrentState(t *testing.T) {
	t.Parallel()

	process := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
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
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "widget-1",
		Shell:      "/bin/zsh",
		WorkingDir: "/workspace/repo",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	handler := NewHandler(runtime, testAuthToken)
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/terminal/widget-1/interrupt", nil)
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}
	if !process.signalled {
		t.Fatal("expected terminal interrupt to signal the process")
	}

	var payload struct {
		State terminal.State `json:"state"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if payload.State.WidgetID != "widget-1" {
		t.Fatalf("expected state for widget-1, got %q", payload.State.WidgetID)
	}
	if payload.State.Status != terminal.StatusRunning {
		t.Fatalf("expected running status, got %q", payload.State.Status)
	}
}
