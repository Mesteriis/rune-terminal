package app

import (
	"context"
	"os"
	"sync"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type interruptFakeProcess struct {
	mu        sync.Mutex
	outputCh  chan []byte
	waitCh    chan struct{}
	signalled bool
}

func (p *interruptFakeProcess) PID() int { return 42 }

func (p *interruptFakeProcess) Write(data []byte) (int, error) {
	return len(data), nil
}

func (p *interruptFakeProcess) Output() <-chan []byte { return p.outputCh }

func (p *interruptFakeProcess) Wait() (int, error) {
	<-p.waitCh
	return 0, nil
}

func (p *interruptFakeProcess) Signal(sig os.Signal) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.signalled = true
	return nil
}

func (p *interruptFakeProcess) Close() error {
	select {
	case <-p.waitCh:
	default:
		close(p.waitCh)
	}
	return nil
}

type interruptFakeLauncher struct {
	process terminal.Process
}

func (l interruptFakeLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}

func TestTermInterruptToolInterruptsActiveWidget(t *testing.T) {
	t.Parallel()

	process := &interruptFakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := terminal.NewService(interruptFakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID: "term-main",
		Shell:    "/bin/sh",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	t.Cleanup(service.Close)

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: service,
	}
	tool := runtime.termInterruptTool()

	execCtx := toolruntime.ExecutionContext{
		ActiveWidgetID:     "term-main",
		TargetSession:      "local",
		TargetConnectionID: "local",
	}
	plan, err := tool.Plan(interruptToolInput{WidgetID: "term-main"}, execCtx)
	if err != nil {
		t.Fatalf("Plan error: %v", err)
	}
	if len(plan.Operation.AffectedWidgets) != 1 || plan.Operation.AffectedWidgets[0] != "term-main" {
		t.Fatalf("unexpected affected widgets: %#v", plan.Operation.AffectedWidgets)
	}

	output, err := tool.Execute(context.Background(), execCtx, interruptToolInput{WidgetID: "term-main"})
	if err != nil {
		t.Fatalf("Execute error: %v", err)
	}
	payload, ok := output.(map[string]any)
	if !ok {
		t.Fatalf("unexpected output payload: %#v", output)
	}
	if payload["widget_id"] != "term-main" || payload["interrupted"] != true {
		t.Fatalf("unexpected tool output: %#v", payload)
	}

	process.mu.Lock()
	defer process.mu.Unlock()
	if !process.signalled {
		t.Fatalf("expected process to receive interrupt signal")
	}
}

func TestTermSendInputToolRequiresExplicitTargetContext(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: terminal.NewService(interruptFakeLauncher{process: &interruptFakeProcess{
			outputCh: make(chan []byte, 1),
			waitCh:   make(chan struct{}),
		}}),
	}
	tool := runtime.termSendInputTool()
	_, err := tool.Execute(
		context.Background(),
		toolruntime.ExecutionContext{},
		sendInputToolInput{
			WidgetID: "term-main",
			Text:     "pwd",
		},
	)
	if err == nil {
		t.Fatalf("expected explicit target context error")
	}
	if got := toolruntime.ErrorCodeOf(err); got != toolruntime.ErrorCodeInvalidInput {
		t.Fatalf("expected invalid input error code, got %q (%v)", got, err)
	}
}

func TestTermSendInputToolRejectsLocalCommandSentToRemoteTarget(t *testing.T) {
	t.Parallel()

	process := &interruptFakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := terminal.NewService(interruptFakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID: "term-main",
		Shell:    "/bin/sh",
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	t.Cleanup(service.Close)

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: service,
	}
	tool := runtime.termSendInputTool()
	_, err := tool.Execute(
		context.Background(),
		toolruntime.ExecutionContext{
			ActiveWidgetID:     "term-main",
			TargetSession:      "remote",
			TargetConnectionID: "conn-ssh",
		},
		sendInputToolInput{
			WidgetID: "term-main",
			Text:     "pwd",
		},
	)
	if err == nil {
		t.Fatalf("expected session target mismatch error")
	}
	if got := toolruntime.ErrorCodeOf(err); got != toolruntime.ErrorCodeInvalidInput {
		t.Fatalf("expected invalid input error code, got %q (%v)", got, err)
	}
}

func TestTermSendInputToolRejectsRemoteCommandSentToLocalTarget(t *testing.T) {
	t.Parallel()

	process := &interruptFakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := terminal.NewService(interruptFakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID: "term-remote",
		Shell:    "/bin/sh",
		Connection: terminal.ConnectionSpec{
			ID:   "conn-ssh",
			Name: "Remote",
			Kind: "ssh",
		},
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	t.Cleanup(service.Close)

	runtime := &Runtime{
		Workspace: workspace.NewService(workspace.BootstrapDefault()),
		Terminals: service,
	}
	tool := runtime.termSendInputTool()
	_, err := tool.Execute(
		context.Background(),
		toolruntime.ExecutionContext{
			ActiveWidgetID:     "term-remote",
			TargetSession:      "local",
			TargetConnectionID: "local",
		},
		sendInputToolInput{
			WidgetID: "term-remote",
			Text:     "pwd",
		},
	)
	if err == nil {
		t.Fatalf("expected remote/local mismatch error")
	}
	if got := toolruntime.ErrorCodeOf(err); got != toolruntime.ErrorCodeInvalidInput {
		t.Fatalf("expected invalid input error code, got %q (%v)", got, err)
	}
}
