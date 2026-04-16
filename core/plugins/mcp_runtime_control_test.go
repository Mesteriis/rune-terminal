package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"sync"
	"testing"
	"time"
)

func TestMCPRuntimeRequiresExplicitStartByDefault(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	invoker := &capturingMCPInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}
	runtime := NewMCPRuntime(registry, &testMCPSpawner{}, invoker)
	defer runtime.Close()

	_, err := runtime.Invoke(context.Background(), MCPInvokeRequest{
		ServerID: "mcp.docs",
		Payload:  json.RawMessage(`{"query":"hello"}`),
	})
	if !errors.Is(err, ErrMCPExplicitStartRequired) {
		t.Fatalf("expected explicit start requirement, got %v", err)
	}
	if invoker.calls != 0 {
		t.Fatalf("expected no invocations before start, got %d", invoker.calls)
	}
}

func TestMCPRuntimeSupportsExplicitStartAndStop(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	spawner := &testMCPSpawner{}
	invoker := &capturingMCPInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}
	runtime := NewMCPRuntime(registry, spawner, invoker)
	defer runtime.Close()

	if err := runtime.Start(context.Background(), "mcp.docs"); err != nil {
		t.Fatalf("Start error: %v", err)
	}
	started, err := registry.Get("mcp.docs")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if started.State != MCPStateIdle || !started.Active {
		t.Fatalf("expected idle+active after start, got %#v", started)
	}

	result, err := runtime.Invoke(context.Background(), MCPInvokeRequest{
		ServerID: "mcp.docs",
		Payload:  json.RawMessage(`{"query":"hello"}`),
	})
	if err != nil {
		t.Fatalf("Invoke error: %v", err)
	}
	if string(result.Output) != `{"ok":true}` {
		t.Fatalf("unexpected invoke output: %s", string(result.Output))
	}
	if invoker.calls != 1 {
		t.Fatalf("expected one invoke call, got %d", invoker.calls)
	}
	if spawner.spawns != 1 {
		t.Fatalf("expected one process spawn, got %d", spawner.spawns)
	}

	if err := runtime.Stop("mcp.docs", false); err != nil {
		t.Fatalf("Stop error: %v", err)
	}
	stopped, err := registry.Get("mcp.docs")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if stopped.State != MCPStateStopped || stopped.Active {
		t.Fatalf("expected stopped+inactive after stop, got %#v", stopped)
	}
}

func TestMCPRuntimeAllowsExplicitOnDemandStart(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	spawner := &testMCPSpawner{}
	invoker := &capturingMCPInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}
	runtime := NewMCPRuntime(registry, spawner, invoker)
	defer runtime.Close()

	_, err := runtime.Invoke(context.Background(), MCPInvokeRequest{
		ServerID:           "mcp.docs",
		Payload:            json.RawMessage(`{"query":"hello"}`),
		AllowOnDemandStart: true,
	})
	if err != nil {
		t.Fatalf("Invoke error: %v", err)
	}
	if spawner.spawns != 1 {
		t.Fatalf("expected on-demand spawn, got %d", spawner.spawns)
	}
}

func TestMCPRuntimeAutoStopsIdleServers(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	current := time.Date(2026, 4, 16, 11, 30, 0, 0, time.UTC)
	runtime := NewMCPRuntimeWithOptions(registry, &testMCPSpawner{}, &capturingMCPInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}, MCPRuntimeOptions{
		NowFn:             func() time.Time { return current },
		IdleTimeout:       5 * time.Minute,
		IdleCheckInterval: -1,
	})
	defer runtime.Close()

	if err := runtime.Start(context.Background(), "mcp.docs"); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	current = current.Add(6 * time.Minute)
	runtime.SweepIdle(current)

	snapshot, err := registry.Get("mcp.docs")
	if err != nil {
		t.Fatalf("Get error: %v", err)
	}
	if snapshot.State != MCPStateStoppedAuto || snapshot.Active {
		t.Fatalf("expected auto-stopped snapshot, got %#v", snapshot)
	}
}

func TestMCPRuntimeDoesNotStopInFlightServer(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	blocked := make(chan struct{})
	enter := make(chan struct{})
	runtime := NewMCPRuntimeWithOptions(registry, &testMCPSpawner{}, MCPInvokerFunc(
		func(context.Context, MCPServerSpec, json.RawMessage) (json.RawMessage, error) {
			close(enter)
			<-blocked
			return json.RawMessage(`{"ok":true}`), nil
		},
	), MCPRuntimeOptions{
		IdleCheckInterval: -1,
	})
	defer runtime.Close()

	done := make(chan error, 1)
	go func() {
		_, err := runtime.Invoke(context.Background(), MCPInvokeRequest{
			ServerID:           "mcp.docs",
			Payload:            json.RawMessage(`{"query":"hello"}`),
			AllowOnDemandStart: true,
		})
		done <- err
	}()
	<-enter

	if err := runtime.Stop("mcp.docs", true); !errors.Is(err, ErrMCPServerBusy) {
		t.Fatalf("expected busy stop error, got %v", err)
	}

	close(blocked)
	if err := <-done; err != nil {
		t.Fatalf("Invoke error: %v", err)
	}
}

func TestMCPRuntimeEnableDisableAndRestart(t *testing.T) {
	t.Parallel()

	registry := NewMCPRegistry()
	if err := registry.Register(MCPServerSpec{
		ID: "mcp.docs",
		Process: ProcessConfig{
			Command: "mcp-docs",
		},
	}); err != nil {
		t.Fatalf("Register error: %v", err)
	}

	runtime := NewMCPRuntimeWithOptions(registry, &testMCPSpawner{}, &capturingMCPInvoker{
		output: json.RawMessage(`{"ok":true}`),
	}, MCPRuntimeOptions{
		IdleCheckInterval: -1,
	})
	defer runtime.Close()

	if err := runtime.Start(context.Background(), "mcp.docs"); err != nil {
		t.Fatalf("Start error: %v", err)
	}
	if err := runtime.SetEnabled("mcp.docs", false); err != nil {
		t.Fatalf("SetEnabled(false) error: %v", err)
	}
	disabled, err := registry.Get("mcp.docs")
	if err != nil {
		t.Fatalf("Get disabled snapshot error: %v", err)
	}
	if disabled.Enabled || disabled.Active {
		t.Fatalf("expected disabled+inactive snapshot, got %#v", disabled)
	}

	_, err = runtime.Invoke(context.Background(), MCPInvokeRequest{
		ServerID:           "mcp.docs",
		AllowOnDemandStart: true,
	})
	if !errors.Is(err, ErrMCPServerDisabled) {
		t.Fatalf("expected disabled invoke error, got %v", err)
	}

	if err := runtime.SetEnabled("mcp.docs", true); err != nil {
		t.Fatalf("SetEnabled(true) error: %v", err)
	}
	if err := runtime.Restart(context.Background(), "mcp.docs"); err != nil {
		t.Fatalf("Restart error: %v", err)
	}
	enabled, err := registry.Get("mcp.docs")
	if err != nil {
		t.Fatalf("Get enabled snapshot error: %v", err)
	}
	if !enabled.Enabled || !enabled.Active || enabled.State != MCPStateIdle {
		t.Fatalf("expected enabled idle running snapshot, got %#v", enabled)
	}
}

type MCPInvokerFunc func(context.Context, MCPServerSpec, json.RawMessage) (json.RawMessage, error)

func (fn MCPInvokerFunc) Invoke(ctx context.Context, spec MCPServerSpec, payload json.RawMessage) (json.RawMessage, error) {
	return fn(ctx, spec, payload)
}

type capturingMCPInvoker struct {
	mu     sync.Mutex
	calls  int
	output json.RawMessage
}

func (i *capturingMCPInvoker) Invoke(context.Context, MCPServerSpec, json.RawMessage) (json.RawMessage, error) {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.calls++
	return append(json.RawMessage(nil), i.output...), nil
}

type testMCPSpawner struct {
	mu     sync.Mutex
	spawns int
}

func (s *testMCPSpawner) Spawn(context.Context, ProcessConfig) (Process, error) {
	s.mu.Lock()
	s.spawns++
	s.mu.Unlock()

	inReader, inWriter := io.Pipe()
	outReader, outWriter := io.Pipe()
	done := make(chan error, 1)

	return &testMCPProcess{
		stdinReader:  inReader,
		stdinWriter:  inWriter,
		stdoutReader: outReader,
		stdoutWriter: outWriter,
		done:         done,
	}, nil
}

type testMCPProcess struct {
	stdinReader  *io.PipeReader
	stdinWriter  *io.PipeWriter
	stdoutReader *io.PipeReader
	stdoutWriter *io.PipeWriter
	done         chan error
	once         sync.Once
}

func (p *testMCPProcess) Stdin() io.WriteCloser {
	return p.stdinWriter
}

func (p *testMCPProcess) Stdout() io.ReadCloser {
	return p.stdoutReader
}

func (p *testMCPProcess) Wait() error {
	return <-p.done
}

func (p *testMCPProcess) Kill() error {
	p.once.Do(func() {
		_ = p.stdinReader.Close()
		_ = p.stdinWriter.Close()
		_ = p.stdoutReader.Close()
		_ = p.stdoutWriter.Close()
		p.done <- nil
	})
	return nil
}
