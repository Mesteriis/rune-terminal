package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"sync"
	"testing"
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
