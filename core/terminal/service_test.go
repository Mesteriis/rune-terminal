package terminal

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"
)

type fakeProcess struct {
	mu        sync.Mutex
	outputCh  chan []byte
	waitCh    chan struct{}
	exitCode  int
	writes    [][]byte
	signalled bool
	closeOnce sync.Once
}

func (p *fakeProcess) PID() int { return 42 }

func (p *fakeProcess) Write(data []byte) (int, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	copyData := make([]byte, len(data))
	copy(copyData, data)
	p.writes = append(p.writes, copyData)
	return len(data), nil
}

func (p *fakeProcess) Output() <-chan []byte { return p.outputCh }

func (p *fakeProcess) Wait() (int, error) {
	<-p.waitCh
	return p.exitCode, nil
}

func (p *fakeProcess) Signal(sig os.Signal) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.signalled = true
	return nil
}

func (p *fakeProcess) Close() error {
	p.closeOnce.Do(func() {
		close(p.waitCh)
	})
	return nil
}

type fakeLauncher struct {
	process *fakeProcess
}

func (l fakeLauncher) Launch(context.Context, LaunchOptions) (Process, error) {
	return l.process, nil
}

type contextBoundProcess struct {
	ctx      context.Context
	outputCh chan []byte
}

func (p *contextBoundProcess) PID() int { return 84 }
func (p *contextBoundProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *contextBoundProcess) Output() <-chan []byte          { return p.outputCh }
func (p *contextBoundProcess) Wait() (int, error) {
	<-p.ctx.Done()
	return -1, nil
}
func (p *contextBoundProcess) Signal(sig os.Signal) error { return nil }
func (p *contextBoundProcess) Close() error               { return nil }

type contextAwareLauncher struct{}

func (contextAwareLauncher) Launch(ctx context.Context, opts LaunchOptions) (Process, error) {
	return &contextBoundProcess{ctx: ctx, outputCh: make(chan []byte)}, nil
}

func TestTerminalServiceSnapshotAndInput(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 8),
		waitCh:   make(chan struct{}),
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("hello\n")
	snapshot, err := service.Snapshot("term-main", 0)
	if err != nil {
		t.Fatalf("Snapshot error: %v", err)
	}
	if snapshot.State.Status != StatusRunning {
		t.Fatalf("expected running status, got %s", snapshot.State.Status)
	}
	if snapshot.State.ConnectionKind != "local" {
		t.Fatalf("expected local connection kind, got %q", snapshot.State.ConnectionKind)
	}
	if snapshot.State.ConnectionID != "local" {
		t.Fatalf("expected local connection id, got %q", snapshot.State.ConnectionID)
	}
	if snapshot.State.ConnectionName != "Local Machine" {
		t.Fatalf("expected local connection name, got %q", snapshot.State.ConnectionName)
	}

	if _, err := service.SendInput("term-main", "pwd", true); err != nil {
		t.Fatalf("SendInput error: %v", err)
	}
	if err := service.Interrupt("term-main"); err != nil {
		t.Fatalf("Interrupt error: %v", err)
	}

	process.mu.Lock()
	defer process.mu.Unlock()
	if len(process.writes) != 1 || string(process.writes[0]) != "pwd\n" {
		t.Fatalf("unexpected writes: %#v", process.writes)
	}
	if !process.signalled {
		t.Fatalf("expected process to be signalled")
	}
}

func TestSSHSessionUsesSharedSnapshotAndChunkSequenceModel(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 8),
		waitCh:   make(chan struct{}),
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{
		WidgetID: "term-ssh",
		Connection: ConnectionSpec{
			ID:   "conn-prod",
			Name: "Prod SSH",
			Kind: "ssh",
			SSH: &SSHConfig{
				Host: "prod.example.com",
				User: "deploy",
			},
		},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("remote-line-1\n")
	process.outputCh <- []byte("remote-line-2\n")
	time.Sleep(20 * time.Millisecond)

	snapshot, err := service.Snapshot("term-ssh", 0)
	if err != nil {
		t.Fatalf("Snapshot error: %v", err)
	}
	if snapshot.State.ConnectionKind != "ssh" {
		t.Fatalf("expected ssh connection kind, got %q", snapshot.State.ConnectionKind)
	}
	if snapshot.State.ConnectionID != "conn-prod" {
		t.Fatalf("expected ssh connection id, got %q", snapshot.State.ConnectionID)
	}
	if snapshot.State.ConnectionName != "Prod SSH" {
		t.Fatalf("expected ssh connection name, got %q", snapshot.State.ConnectionName)
	}
	if snapshot.State.Shell != "ssh" {
		t.Fatalf("expected ssh shell marker, got %q", snapshot.State.Shell)
	}
	if snapshot.NextSeq != 3 {
		t.Fatalf("expected next seq=3 for two chunks, got %d", snapshot.NextSeq)
	}
	if len(snapshot.Chunks) != 2 {
		t.Fatalf("expected 2 chunks, got %d", len(snapshot.Chunks))
	}
	if snapshot.Chunks[0].Seq != 1 || snapshot.Chunks[1].Seq != 2 {
		t.Fatalf("unexpected chunk sequence values: %#v", snapshot.Chunks)
	}
}

func TestSnapshotAndSubscribeCoversBufferedAndLiveOutput(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 8),
		waitCh:   make(chan struct{}),
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	defer service.Close()

	process.outputCh <- []byte("before\n")
	deadline := time.Now().Add(500 * time.Millisecond)
	for {
		snapshot, err := service.Snapshot("term-main", 0)
		if err != nil {
			t.Fatalf("Snapshot error: %v", err)
		}
		if len(snapshot.Chunks) == 1 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for buffered output, got %#v", snapshot.Chunks)
		}
		time.Sleep(10 * time.Millisecond)
	}

	snapshot, ch, unsubscribe, err := service.SnapshotAndSubscribe("term-main", 0)
	if err != nil {
		t.Fatalf("SnapshotAndSubscribe error: %v", err)
	}
	defer unsubscribe()

	if len(snapshot.Chunks) != 1 {
		t.Fatalf("expected 1 buffered chunk, got %d", len(snapshot.Chunks))
	}
	if snapshot.Chunks[0].Seq != 1 || snapshot.NextSeq != 2 {
		t.Fatalf("unexpected snapshot sequencing: %#v", snapshot)
	}

	process.outputCh <- []byte("after\n")

	select {
	case chunk := <-ch:
		if chunk.Seq != 2 {
			t.Fatalf("expected live chunk seq 2, got %#v", chunk)
		}
		if chunk.Data != "after\n" {
			t.Fatalf("unexpected live chunk data %#v", chunk)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timed out waiting for subscribed live chunk")
	}
}

func TestCloseSessionRemovesTerminal(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 4),
		waitCh:   make(chan struct{}),
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	if err := service.CloseSession("term-main"); err != nil {
		t.Fatalf("CloseSession error: %v", err)
	}
	if _, err := service.GetState("term-main"); err == nil {
		t.Fatalf("expected closed session to be removed")
	}
}

func TestNonZeroExitMarksTerminalFailed(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 255,
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("boom\n")
	close(process.outputCh)
	process.closeOnce.Do(func() {
		close(process.waitCh)
	})

	time.Sleep(50 * time.Millisecond)

	state, err := service.GetState("term-main")
	if err != nil {
		t.Fatalf("GetState error: %v", err)
	}
	if state.Status != StatusFailed {
		t.Fatalf("expected failed status from fake non-zero-exit process, got %s", state.Status)
	}
}

func TestTerminalSessionIgnoresCallerCancellationAfterStart(t *testing.T) {
	t.Parallel()

	callerCtx, cancelCaller := context.WithCancel(context.Background())
	defer cancelCaller()

	service := NewService(contextAwareLauncher{})
	if _, err := service.StartSession(callerCtx, LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	cancelCaller()
	time.Sleep(50 * time.Millisecond)

	state, err := service.GetState("term-main")
	if err != nil {
		t.Fatalf("GetState error: %v", err)
	}
	if state.Status != StatusRunning {
		t.Fatalf("expected session to stay running after caller cancellation, got %s", state.Status)
	}

	if err := service.CloseSession("term-main"); err != nil {
		t.Fatalf("CloseSession error: %v", err)
	}
}
