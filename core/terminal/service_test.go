package terminal

import (
	"context"
	"os"
	"sync"
	"testing"
)

type fakeProcess struct {
	mu        sync.Mutex
	outputCh  chan []byte
	waitCh    chan struct{}
	writes    [][]byte
	signalled bool
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
	return 0, nil
}

func (p *fakeProcess) Signal(sig os.Signal) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.signalled = true
	return nil
}

func (p *fakeProcess) Close() error {
	close(p.waitCh)
	return nil
}

type fakeLauncher struct {
	process *fakeProcess
}

func (l fakeLauncher) Launch(context.Context, LaunchOptions) (Process, error) {
	return l.process, nil
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
