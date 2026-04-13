package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type launchTestChecker struct{}

func (launchTestChecker) Check(_ context.Context, _ connections.Connection) connections.CheckResult {
	return connections.CheckResult{
		Status: connections.CheckStatusPassed,
	}
}

type launchTestProcess struct {
	pid      int
	outputCh chan []byte
	waitCh   chan struct{}
	exitCode int
}

func (p *launchTestProcess) PID() int                       { return p.pid }
func (p *launchTestProcess) Write(data []byte) (int, error) { return len(data), nil }
func (p *launchTestProcess) Output() <-chan []byte         { return p.outputCh }
func (p *launchTestProcess) Wait() (int, error)            { <-p.waitCh; return p.exitCode, nil }
func (p *launchTestProcess) Signal(_ os.Signal) error      { return nil }
func (p *launchTestProcess) Close() error {
	select {
	case <-p.waitCh:
	default:
		close(p.waitCh)
	}
	return nil
}

type launchTestLauncher struct {
	process terminal.Process
}

func (l launchTestLauncher) Launch(context.Context, terminal.LaunchOptions) (terminal.Process, error) {
	return l.process, nil
}

func newLaunchRuntime(t *testing.T, process terminal.Process) *Runtime {
	t.Helper()

	connectionStore, err := connections.NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), launchTestChecker{})
	if err != nil {
		t.Fatalf("new connections service: %v", err)
	}

	return &Runtime{
		RepoRoot:    t.TempDir(),
		Workspace:   workspace.NewService(workspace.BootstrapDefault()),
		Terminals:   terminal.NewService(launchTestLauncher{process: process}),
		Connections: connectionStore,
	}
}

func TestObserveConnectionLaunchMarksLaunchFailedOnEarlySSHExit(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      42,
		outputCh: make(chan []byte),
		waitCh:   make(chan struct{}),
		exitCode: 255,
	}
	close(process.outputCh)
	close(process.waitCh)

	runtime := newLaunchRuntime(t, process)
	connection, _, err := runtime.Connections.SaveSSH(connections.SaveSSHInput{
		Name: "Failing SSH",
		Host: "example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save ssh connection: %v", err)
	}

	spec, err := runtime.connectionForWidget(connection.ID)
	if err != nil {
		t.Fatalf("connectionForWidget: %v", err)
	}
	if spec.Kind != "ssh" {
		t.Fatalf("expected ssh connection kind, got %q", spec.Kind)
	}
	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-fail",
		WorkingDir: runtime.RepoRoot,
		Connection: spec,
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	err = runtime.observeConnectionLaunch(context.Background(), "term-fail", spec)
	if err == nil {
		t.Fatalf("expected ssh launch observation to fail")
	}
	if _, _, reportErr := runtime.Connections.ReportLaunchResult(connection.ID, err); reportErr != nil {
		t.Fatalf("ReportLaunchResult error: %v", reportErr)
	}

	updated, err := runtime.Connections.Resolve(connection.ID)
	if err != nil {
		t.Fatalf("resolve connection: %v", err)
	}
	if updated.Runtime.LaunchStatus != connections.LaunchStatusFailed {
		t.Fatalf("expected failed launch status, got %q", updated.Runtime.LaunchStatus)
	}
	if updated.Runtime.LaunchError == "" {
		t.Fatalf("expected launch error to be recorded")
	}
	if updated.Usability != connections.UsabilityAttention {
		t.Fatalf("expected attention usability, got %q", updated.Usability)
	}
}

func TestObserveConnectionLaunchMarksLaunchSucceededAfterSSHProbe(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      43,
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	process.outputCh <- []byte("remote@fixture:~$ ")

	runtime := newLaunchRuntime(t, process)
	connection, _, err := runtime.Connections.SaveSSH(connections.SaveSSHInput{
		Name: "Working SSH",
		Host: "fixture.example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save ssh connection: %v", err)
	}

	spec, err := runtime.connectionForWidget(connection.ID)
	if err != nil {
		t.Fatalf("connectionForWidget: %v", err)
	}
	if _, err := runtime.Terminals.StartSession(context.Background(), terminal.LaunchOptions{
		WidgetID:   "term-success",
		WorkingDir: runtime.RepoRoot,
		Connection: spec,
	}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	if err := runtime.observeConnectionLaunch(context.Background(), "term-success", spec); err != nil {
		t.Fatalf("expected ssh launch success, got %v", err)
	}
	if _, _, reportErr := runtime.Connections.ReportLaunchResult(connection.ID, nil); reportErr != nil {
		t.Fatalf("ReportLaunchResult error: %v", reportErr)
	}

	updated, err := runtime.Connections.Resolve(connection.ID)
	if err != nil {
		t.Fatalf("resolve connection: %v", err)
	}
	if updated.Runtime.LaunchStatus != connections.LaunchStatusSucceeded {
		t.Fatalf("expected succeeded launch status, got %q", updated.Runtime.LaunchStatus)
	}
	if updated.Usability != connections.UsabilityAvailable {
		t.Fatalf("expected available usability, got %q", updated.Usability)
	}
}
