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
	"github.com/Mesteriis/rune-terminal/core/workspace"
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

func TestTerminalLatestCommandReturnsRecordedCommandAndOutput(t *testing.T) {
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
	if _, err := runtime.Terminals.SendInput("widget-1", "pwd", true); err != nil {
		t.Fatalf("SendInput error: %v", err)
	}

	process.outputCh <- []byte("pwd\n")
	process.outputCh <- []byte("/workspace/repo\n")
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
	req := httptest.NewRequest(http.MethodGet, "/api/v1/terminal/widget-1/commands/latest", nil)
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response app.TerminalLatestCommandResult
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	if response.Command != "pwd" {
		t.Fatalf("expected pwd command, got %#v", response)
	}
	if response.FromSeq != 1 {
		t.Fatalf("expected command baseline seq 1, got %#v", response)
	}
	if !strings.Contains(response.OutputExcerpt, "/workspace/repo") {
		t.Fatalf("expected normalized command output excerpt, got %#v", response)
	}
}

func TestTerminalSessionCatalogReturnsWorkspaceAndGroupedSessionMetadata(t *testing.T) {
	t.Parallel()

	processA := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	processB := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	launcher := &httpQueueLauncher{processes: []terminal.Process{processA, processB}}

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
	workspaceSnapshot := workspace.BootstrapDefault()
	runtime := &app.Runtime{
		RepoRoot:         "/workspace/repo",
		Workspace:        workspace.NewService(workspaceSnapshot),
		WorkspaceCatalog: workspace.NewCatalogStore(workspace.BootstrapCatalog(workspaceSnapshot)),
		Terminals:        terminal.NewService(launcher),
		Agent:            agentStore,
		Policy:           policyStore,
		Audit:            auditLog,
		Registry:         registry,
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		Shell:      "/bin/zsh",
		WorkingDir: "/workspace/repo",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	if _, err := runtime.Terminals.CreateSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		SessionID:  "sess-2",
		Shell:      "/bin/zsh",
		WorkingDir: "/workspace/repo",
	}); err != nil {
		t.Fatalf("CreateSession error: %v", err)
	}

	handler := NewHandler(runtime, testAuthToken)
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/terminal/sessions", nil)
	req.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var response app.TerminalSessionCatalogResult
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if response.ActiveWorkspaceID != "ws-local" {
		t.Fatalf("expected active workspace ws-local, got %q", response.ActiveWorkspaceID)
	}
	if len(response.Sessions) < 2 {
		t.Fatalf("expected grouped terminal sessions in catalog, got %#v", response.Sessions)
	}

	mainSessions := 0
	activeGroupedSession := false
	for _, entry := range response.Sessions {
		if entry.WidgetID != "term-main" {
			continue
		}
		mainSessions += 1
		if entry.WorkspaceName != "Local Workspace" {
			t.Fatalf("expected workspace metadata for term-main, got %#v", entry)
		}
		if entry.TabTitle != "Main Shell" {
			t.Fatalf("expected tab title Main Shell, got %#v", entry)
		}
		if entry.IsActiveSession && entry.SessionID == "sess-2" {
			activeGroupedSession = true
		}
	}

	if mainSessions != 2 {
		t.Fatalf("expected 2 grouped sessions for term-main, got %d (%#v)", mainSessions, response.Sessions)
	}
	if !activeGroupedSession {
		t.Fatalf("expected sess-2 to be marked active in %#v", response.Sessions)
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

type httpQueueLauncher struct {
	mu        sync.Mutex
	processes []terminal.Process
}

func (l *httpQueueLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.processes) == 0 {
		return nil, fmt.Errorf("no process configured")
	}
	process := l.processes[0]
	l.processes = l.processes[1:]
	return process, nil
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

func TestTerminalSessionEndpointsCreateAndFocusGroupedSessions(t *testing.T) {
	t.Parallel()

	processA := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	processB := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	launcher := &httpQueueLauncher{
		processes: []terminal.Process{processA, processB},
	}

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
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: terminal.NewService(launcher),
		Agent:     agentStore,
		Policy:    policyStore,
		Audit:     auditLog,
		Registry:  registry,
		Connections: func() *connections.Service {
			store, storeErr := connections.NewService(filepath.Join(tempDir, "connections.json"))
			if storeErr != nil {
				t.Fatalf("connections store: %v", storeErr)
			}
			return store
		}(),
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		WorkingDir: runtime.RepoRoot,
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	processA.outputCh <- []byte("session-a\n")

	handler := NewHandler(runtime, testAuthToken)

	createRecorder := httptest.NewRecorder()
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/terminal/term-main/sessions", nil)
	createReq.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(createRecorder, createReq)

	if createRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 create, got %d (%s)", createRecorder.Code, createRecorder.Body.String())
	}

	var created terminal.Snapshot
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("Unmarshal create snapshot error: %v", err)
	}
	if created.ActiveSessionID == "" || created.ActiveSessionID == "term-main" {
		t.Fatalf("expected new active sibling session, got %q", created.ActiveSessionID)
	}
	if len(created.Sessions) != 2 {
		t.Fatalf("expected 2 grouped sessions after create, got %d", len(created.Sessions))
	}

	focusRecorder := httptest.NewRecorder()
	focusReq := authedJSONRequest(t, http.MethodPut, "/api/v1/terminal/term-main/sessions/active", map[string]any{
		"session_id": "term-main",
	})
	handler.ServeHTTP(focusRecorder, focusReq)

	if focusRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 focus, got %d (%s)", focusRecorder.Code, focusRecorder.Body.String())
	}

	var focused terminal.Snapshot
	if err := json.Unmarshal(focusRecorder.Body.Bytes(), &focused); err != nil {
		t.Fatalf("Unmarshal focus snapshot error: %v", err)
	}
	if focused.ActiveSessionID != "term-main" {
		t.Fatalf("expected active session term-main, got %q", focused.ActiveSessionID)
	}
}

func TestTerminalSessionEndpointClosesGroupedSession(t *testing.T) {
	t.Parallel()

	processA := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	processB := &httpTestProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	launcher := &httpQueueLauncher{
		processes: []terminal.Process{processA, processB},
	}

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
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: terminal.NewService(launcher),
		Agent:     agentStore,
		Policy:    policyStore,
		Audit:     auditLog,
		Registry:  registry,
		Connections: func() *connections.Service {
			store, storeErr := connections.NewService(filepath.Join(tempDir, "connections.json"))
			if storeErr != nil {
				t.Fatalf("connections store: %v", storeErr)
			}
			return store
		}(),
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)

	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		WorkingDir: runtime.RepoRoot,
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	if _, err := runtime.CreateTerminalSiblingSession(context.Background(), "term-main"); err != nil {
		t.Fatalf("CreateTerminalSiblingSession error: %v", err)
	}
	snapshotBeforeClose, err := runtime.TerminalSnapshot("term-main", 0)
	if err != nil {
		t.Fatalf("TerminalSnapshot error: %v", err)
	}
	if len(snapshotBeforeClose.Sessions) != 2 {
		t.Fatalf("expected two sessions before close, got %d", len(snapshotBeforeClose.Sessions))
	}
	sessionToClose := snapshotBeforeClose.ActiveSessionID

	handler := NewHandler(runtime, testAuthToken)

	closeRecorder := httptest.NewRecorder()
	closeReq := httptest.NewRequest(
		http.MethodDelete,
		"/api/v1/terminal/term-main/sessions/"+sessionToClose,
		nil,
	)
	closeReq.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(closeRecorder, closeReq)

	if closeRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 close, got %d (%s)", closeRecorder.Code, closeRecorder.Body.String())
	}

	var closed terminal.Snapshot
	if err := json.Unmarshal(closeRecorder.Body.Bytes(), &closed); err != nil {
		t.Fatalf("Unmarshal close snapshot error: %v", err)
	}
	if len(closed.Sessions) != 1 {
		t.Fatalf("expected one remaining session after close, got %d", len(closed.Sessions))
	}
	if closed.ActiveSessionID != "term-main" {
		t.Fatalf("expected active session term-main after close, got %q", closed.ActiveSessionID)
	}
}

func TestTerminalControlHandlersAppendAuditEvents(t *testing.T) {
	t.Parallel()

	auditLog, handler := newTerminalAuditHandler(t)

	createRecorder := httptest.NewRecorder()
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/terminal/term-main/sessions", nil)
	createReq.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(createRecorder, createReq)
	if createRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 create, got %d (%s)", createRecorder.Code, createRecorder.Body.String())
	}
	var created terminal.Snapshot
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created snapshot: %v", err)
	}
	if created.ActiveSessionID == "" || created.ActiveSessionID == "term-main" {
		t.Fatalf("expected sibling active session, got %q", created.ActiveSessionID)
	}

	focusRecorder := httptest.NewRecorder()
	handler.ServeHTTP(focusRecorder, authedJSONRequest(t, http.MethodPut, "/api/v1/terminal/term-main/sessions/active", map[string]any{
		"session_id": "term-main",
	}))
	if focusRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 focus, got %d (%s)", focusRecorder.Code, focusRecorder.Body.String())
	}

	interruptRecorder := httptest.NewRecorder()
	interruptReq := httptest.NewRequest(http.MethodPost, "/api/v1/terminal/term-main/interrupt", nil)
	interruptReq.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(interruptRecorder, interruptReq)
	if interruptRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 interrupt, got %d (%s)", interruptRecorder.Code, interruptRecorder.Body.String())
	}

	closeRecorder := httptest.NewRecorder()
	closeReq := httptest.NewRequest(http.MethodDelete, "/api/v1/terminal/term-main/sessions/"+created.ActiveSessionID, nil)
	closeReq.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(closeRecorder, closeReq)
	if closeRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 close, got %d (%s)", closeRecorder.Code, closeRecorder.Body.String())
	}

	events, err := auditLog.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	expectedTools := []string{
		"terminal.session.create",
		"terminal.session.focus",
		"terminal.interrupt",
		"terminal.session.close",
	}
	if len(events) != len(expectedTools) {
		t.Fatalf("expected %d terminal audit events, got %#v", len(expectedTools), events)
	}
	for index, expectedTool := range expectedTools {
		event := events[index]
		if event.ToolName != expectedTool || event.ActionSource != "http.terminal" || !event.Success || event.Error != "" {
			t.Fatalf("unexpected terminal audit event %d: %#v", index, event)
		}
		if !terminalAuditContains(event.AffectedWidgets, "term-main") {
			t.Fatalf("expected term-main affected widget in event %d: %#v", index, event)
		}
		if event.TargetConnectionID != "local" {
			t.Fatalf("expected local connection in event %d: %#v", index, event)
		}
	}
	if events[0].TargetSession == "" || events[0].TargetSession == "term-main" {
		t.Fatalf("expected created session id in audit event, got %#v", events[0])
	}
	if events[1].TargetSession != "term-main" {
		t.Fatalf("expected focused session id in audit event, got %#v", events[1])
	}
	if events[3].TargetSession != created.ActiveSessionID {
		t.Fatalf("expected closed session id in audit event, got %#v", events[3])
	}
}

func TestTerminalControlHandlersAppendFailureAuditEvents(t *testing.T) {
	t.Parallel()

	auditLog, handler := newTerminalAuditHandler(t)

	closeRecorder := httptest.NewRecorder()
	closeReq := httptest.NewRequest(http.MethodDelete, "/api/v1/terminal/term-main/sessions/term-main", nil)
	closeReq.Header.Set("Authorization", "Bearer "+testAuthToken)
	handler.ServeHTTP(closeRecorder, closeReq)
	if closeRecorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 close last session, got %d (%s)", closeRecorder.Code, closeRecorder.Body.String())
	}

	events, err := auditLog.List(10)
	if err != nil {
		t.Fatalf("audit list: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected one terminal failure audit event, got %#v", events)
	}
	event := events[0]
	if event.ToolName != "terminal.session.close" || event.ActionSource != "http.terminal" ||
		event.Success || event.Error == "" {
		t.Fatalf("unexpected terminal failure audit event: %#v", event)
	}
	if event.TargetSession != "term-main" || !terminalAuditContains(event.AffectedWidgets, "term-main") {
		t.Fatalf("expected failed terminal target in audit event, got %#v", event)
	}
}

func newTerminalAuditHandler(t *testing.T) (*audit.Log, http.Handler) {
	t.Helper()

	tempDir := t.TempDir()
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	connectionStore, err := connections.NewService(filepath.Join(tempDir, "connections.json"))
	if err != nil {
		t.Fatalf("connections store: %v", err)
	}
	launcher := &httpQueueLauncher{
		processes: []terminal.Process{
			&httpTestProcess{outputCh: make(chan []byte, 1), waitCh: make(chan struct{})},
			&httpTestProcess{outputCh: make(chan []byte, 1), waitCh: make(chan struct{})},
			&httpTestProcess{outputCh: make(chan []byte, 1), waitCh: make(chan struct{})},
		},
	}
	registry := toolruntime.NewRegistry()
	runtime := &app.Runtime{
		RepoRoot:    "/workspace/repo",
		Workspace:   workspace.NewService(workspace.BootstrapDefault()),
		Terminals:   terminal.NewService(launcher),
		Connections: connectionStore,
		Agent:       agentStore,
		Policy:      policyStore,
		Audit:       auditLog,
		Registry:    registry,
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit)
	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-main",
		WorkingDir: runtime.RepoRoot,
		Connection: terminal.ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	return auditLog, NewHandler(runtime, testAuthToken)
}

func terminalAuditContains(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}
