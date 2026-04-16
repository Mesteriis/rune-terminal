package plugins

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"path/filepath"
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
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
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
	if result.Manifest.PluginID != "example-plugin" {
		t.Fatalf("unexpected plugin manifest: %#v", result.Manifest)
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
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
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
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
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

func TestInvokeFailsWhenPluginCommandPathIsMissing(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(OSProcessSpawner{}, time.Second)
	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example-plugin",
		Process: ProcessConfig{
			Command: filepath.Join(t.TempDir(), "missing-plugin-binary"),
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrProcessSpawnFailed) {
		t.Fatalf("expected spawn error, got %v", err)
	}
}

func TestInvokeFailsWhenStartupExceedsLaunchTimeout(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(delayedSpawner{
		delay: 80 * time.Millisecond,
		inner: scriptedSpawner{
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader := bufio.NewReader(stdin)
				var handshakeReq PluginHandshakeRequest
				if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
					return err
				}
				if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
					Type: MessageTypeHandshake,
					Manifest: PluginManifest{
						PluginID:        "example-plugin",
						PluginVersion:   "1.0.0",
						ProtocolVersion: ProtocolVersionV1,
						ExposedTools:    []string{"plugin.example"},
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
		},
	}, time.Second)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name:          "example-plugin",
		LaunchTimeout: 20 * time.Millisecond,
		Process: ProcessConfig{
			Command: "scripted",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrProcessSpawnFailed) {
		t.Fatalf("expected startup timeout to return spawn error, got %v", err)
	}
}

func TestInvokeFailsWhenHandshakeExceedsTimeout(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			time.Sleep(120 * time.Millisecond)
			return scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
				},
			})
		},
	}, time.Second)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name:             "example-plugin",
		HandshakeTimeout: 20 * time.Millisecond,
		Process: ProcessConfig{
			Command: "scripted",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrPluginTimeout) {
		t.Fatalf("expected handshake timeout error, got %v", err)
	}
}

func TestInvokeFailsWhenPluginCrashesDuringExecutionAfterHandshake(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
				},
			}); err != nil {
				return err
			}
			// Simulate plugin crash after handshake: close stdout without sending response.
			return nil
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
	if !errors.Is(err, ErrPluginProcessCrashed) {
		t.Fatalf("expected process crash error, got %v", err)
	}
}

func TestInvokeTimesOutDuringExecutionAfterHandshake(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
				},
			}); err != nil {
				return err
			}
			var req PluginRequest
			if err := scriptReadJSONLine(reader, &req); err != nil {
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
		t.Fatalf("expected execution timeout error, got %v", err)
	}
}

func TestInvokeFailsWhenPluginDoesNotExitWithinTeardownTimeout(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			if err := scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.example"},
				},
			}); err != nil {
				return err
			}

			var req PluginRequest
			if err := scriptReadJSONLine(reader, &req); err != nil {
				return err
			}
			if err := scriptWriteJSONLine(stdout, PluginResponse{
				Type:      MessageTypeResponse,
				RequestID: req.RequestID,
				Status:    PluginResponseStatusOK,
				Output:    json.RawMessage(`{"echo":"ok"}`),
			}); err != nil {
				return err
			}

			// Plugin keeps running after response; runtime must enforce teardown.
			time.Sleep(150 * time.Millisecond)
			return nil
		},
	}, time.Second)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name:            "example-plugin",
		TeardownTimeout: 20 * time.Millisecond,
		Process: ProcessConfig{
			Command: "scripted",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrPluginProcessCrashed) {
		t.Fatalf("expected teardown crash error, got %v", err)
	}
}

func TestInvokeReturnsProtocolVersionMismatchFailureCode(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			return scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: "rterm.plugin.v0",
					ExposedTools:    []string{"plugin.example"},
				},
			})
		},
	}, time.Second)

	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example-plugin",
		Process: ProcessConfig{
			Command: "scripted",
		},
		Protocol: ProtocolVersionV1,
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	failure, ok := AsFailure(err)
	if !ok {
		t.Fatalf("expected FailureError, got %T (%v)", err, err)
	}
	if failure.Code != FailureCodeProtocolVersionMismatch {
		t.Fatalf("expected protocol_version_mismatch, got %s", failure.Code)
	}
}

func TestInvokeReturnsToolNotExposedFailureCode(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(scriptedSpawner{
		script: func(stdin io.Reader, stdout io.Writer) error {
			reader := bufio.NewReader(stdin)
			var handshakeReq PluginHandshakeRequest
			if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
				return err
			}
			return scriptWriteJSONLine(stdout, PluginHandshakeResponse{
				Type: MessageTypeHandshake,
				Manifest: PluginManifest{
					PluginID:        "example-plugin",
					PluginVersion:   "1.0.0",
					ProtocolVersion: ProtocolVersionV1,
					ExposedTools:    []string{"plugin.other_tool"},
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
	failure, ok := AsFailure(err)
	if !ok {
		t.Fatalf("expected FailureError, got %T (%v)", err, err)
	}
	if failure.Code != FailureCodeToolNotExposed {
		t.Fatalf("expected tool_not_exposed, got %s", failure.Code)
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

type delayedSpawner struct {
	delay time.Duration
	inner ProcessSpawner
}

func (s delayedSpawner) Spawn(ctx context.Context, config ProcessConfig) (Process, error) {
	time.Sleep(s.delay)
	return s.inner.Spawn(ctx, config)
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
