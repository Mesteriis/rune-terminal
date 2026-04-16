package plugins

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"sync"
	"testing"
	"time"
)

func TestNewRuntimeAppliesDefaults(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(nil, 0)
	if runtime.DefaultTimeout() != DefaultInvokeTimeout {
		t.Fatalf("expected default timeout %s, got %s", DefaultInvokeTimeout, runtime.DefaultTimeout())
	}
}

func TestInvokeReturnsOutputFromPluginResponse(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			if handshakeReq.Type != MessageTypeHandshake || handshakeReq.ProtocolVersion != ProtocolVersionV1 {
				return errors.New("unexpected handshake request")
			}
			if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type:            MessageTypeHandshake,
				ProtocolVersion: ProtocolVersionV1,
				Plugin: PluginMetadata{
					Name:    "example-plugin",
					Version: "1.0.0",
				},
			}); err != nil {
				return err
			}

			var executeReq PluginRequest
			if err := scriptReadJSONLine(reader, &executeReq); err != nil {
				return err
			}
			return scriptWriteJSONLine(stdout, PluginResponse{
				Type:      MessageTypeResponse,
				RequestID: executeReq.RequestID,
				Status:    PluginResponseStatusOK,
				Output:    json.RawMessage(`{"echo":"ok"}`),
			})
		},
	}, time.Second)

	result, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example-plugin",
		Process: ProcessConfig{
			Command: "scripted",
		},
		Protocol: ProtocolVersionV1,
	}, InvokeRequest{
		ToolName: "plugin.example",
		Input:    json.RawMessage(`{"text":"hello"}`),
	})
	if err != nil {
		t.Fatalf("Invoke error: %v", err)
	}
	if result.Plugin.Name != "example-plugin" {
		t.Fatalf("unexpected plugin metadata: %#v", result.Plugin)
	}
	if string(result.Output) != `{"echo":"ok"}` {
		t.Fatalf("unexpected output: %s", string(result.Output))
	}
}

func TestInvokeValidatesSpecAndRequest(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(nil, time.Second)
	_, err := runtime.Invoke(context.Background(), PluginSpec{}, InvokeRequest{})
	if !errors.Is(err, ErrInvalidPluginSpec) {
		t.Fatalf("expected ErrInvalidPluginSpec, got %v", err)
	}
}

func TestInvokeReturnsExecutionErrorWhenPluginRespondsWithError(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type:            MessageTypeHandshake,
				ProtocolVersion: ProtocolVersionV1,
				Plugin: PluginMetadata{
					Name:    "example-plugin",
					Version: "1.0.0",
				},
			}); err != nil {
				return err
			}

			var executeReq PluginRequest
			if err := scriptReadJSONLine(reader, &executeReq); err != nil {
				return err
			}
			return scriptWriteJSONLine(stdout, PluginResponse{
				Type:      MessageTypeResponse,
				RequestID: executeReq.RequestID,
				Status:    PluginResponseStatusError,
				Error: &PluginError{
					Code:    "invalid_input",
					Message: "missing text field",
				},
			})
		},
	}, time.Second)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example-plugin",
		Process: ProcessConfig{
			Command: "scripted",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if err == nil {
		t.Fatalf("expected plugin execution error")
	}
	var executionErr *ExecutionError
	if !errors.As(err, &executionErr) {
		t.Fatalf("expected *ExecutionError, got %T (%v)", err, err)
	}
	if executionErr.Code != "invalid_input" || executionErr.Message != "missing text field" {
		t.Fatalf("unexpected execution error payload: %#v", executionErr)
	}
}

func TestInvokeRejectsMalformedPluginResponse(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type:            MessageTypeHandshake,
				ProtocolVersion: ProtocolVersionV1,
				Plugin: PluginMetadata{
					Name:    "example-plugin",
					Version: "1.0.0",
				},
			}); err != nil {
				return err
			}
			var executeReq PluginRequest
			if err := scriptReadJSONLine(reader, &executeReq); err != nil {
				return err
			}
			_, err := io.WriteString(stdout, "{bad json\n")
			return err
		},
	}, time.Second)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example-plugin",
		Process: ProcessConfig{
			Command: "scripted",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrMalformedPluginOutput) {
		t.Fatalf("expected malformed output error, got %v", err)
	}
}

func TestInvokeTimesOutWhenPluginDoesNotRespond(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			time.Sleep(120 * time.Millisecond)
			return nil
		},
	}, 20*time.Millisecond)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example-plugin",
		Process: ProcessConfig{
			Command: "scripted",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrPluginTimeout) {
		t.Fatalf("expected timeout error, got %v", err)
	}
}

type scriptedSpawner struct {
	script func(stdin io.Reader, stdout io.Writer) error
}

func (s scriptedSpawner) Spawn(context.Context, ProcessConfig) (Process, error) {
	coreToPluginReader, coreToPluginWriter := io.Pipe()
	pluginToCoreReader, pluginToCoreWriter := io.Pipe()

	done := make(chan error, 1)
	var closeOnce sync.Once
	closeAll := func() {
		closeOnce.Do(func() {
			_ = coreToPluginReader.Close()
			_ = coreToPluginWriter.Close()
			_ = pluginToCoreWriter.Close()
			_ = pluginToCoreReader.Close()
		})
	}

	go func() {
		var err error
		if s.script != nil {
			err = s.script(coreToPluginReader, pluginToCoreWriter)
		}
		_ = pluginToCoreWriter.Close()
		_ = coreToPluginReader.Close()
		done <- err
	}()

	return &scriptedProcess{
		stdin:  coreToPluginWriter,
		stdout: pluginToCoreReader,
		done:   done,
		kill: func() error {
			closeAll()
			return nil
		},
	}, nil
}

type scriptedProcess struct {
	stdin  io.WriteCloser
	stdout io.ReadCloser
	done   chan error
	kill   func() error
}

func (p *scriptedProcess) Stdin() io.WriteCloser {
	return p.stdin
}

func (p *scriptedProcess) Stdout() io.ReadCloser {
	return p.stdout
}

func (p *scriptedProcess) Wait() error {
	return <-p.done
}

func (p *scriptedProcess) Kill() error {
	if p.kill == nil {
		return nil
	}
	return p.kill()
}

func scriptReadJSONLine(reader *bufio.Reader, target any) error {
	line, err := reader.ReadBytes('\n')
	if err != nil {
		return err
	}
	line = bytes.TrimSpace(line)
	if len(line) == 0 {
		return io.EOF
	}
	return json.Unmarshal(line, target)
}

func scriptWriteJSONLine(writer io.Writer, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	payload = append(payload, '\n')
	_, err = writer.Write(payload)
	return err
}
