package plugins

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"io"
	"testing"
	"time"
)

func TestRuntimeChaosFaultInjectionClassifiesBoundaryFailures(t *testing.T) {
	t.Parallel()

	writeHandshake := func(stdout io.Writer) error {
		return scriptWriteJSONLine(stdout, PluginHandshakeResponse{
			Type: MessageTypeHandshake,
			Manifest: PluginManifest{
				PluginID:        "example-plugin",
				PluginVersion:   "1.0.0",
				ProtocolVersion: ProtocolVersionV1,
				ExposedTools:    []string{"plugin.example"},
			},
		})
	}
	readHandshake := func(stdin io.Reader) (*bufio.Reader, error) {
		reader := bufio.NewReader(stdin)
		var handshakeReq PluginHandshakeRequest
		if err := scriptReadJSONLine(reader, &handshakeReq); err != nil {
			return nil, err
		}
		return reader, nil
	}
	writeSuccessfulResponse := func(reader *bufio.Reader, stdout io.Writer) error {
		var executeReq PluginRequest
		if err := scriptReadJSONLine(reader, &executeReq); err != nil {
			return err
		}
		return scriptWriteJSONLine(stdout, PluginResponse{
			Type:      MessageTypeResponse,
			RequestID: executeReq.RequestID,
			Status:    PluginResponseStatusOK,
			Output:    json.RawMessage(`{"ok":true}`),
		})
	}

	tests := []struct {
		name      string
		spec      PluginSpec
		timeout   time.Duration
		script    func(stdin io.Reader, stdout io.Writer) error
		wantCode  FailureCode
		wantCause error
	}{
		{
			name: "crash before handshake",
			script: func(io.Reader, io.Writer) error {
				return nil
			},
			wantCode:  FailureCodeCrashed,
			wantCause: ErrPluginProcessCrashed,
		},
		{
			name: "malformed handshake frame",
			script: func(stdin io.Reader, stdout io.Writer) error {
				if _, err := readHandshake(stdin); err != nil {
					return err
				}
				_, err := io.WriteString(stdout, "{bad json\n")
				return err
			},
			wantCode:  FailureCodeMalformedResponse,
			wantCause: ErrMalformedPluginOutput,
		},
		{
			name: "wrong handshake message type",
			script: func(stdin io.Reader, stdout io.Writer) error {
				if _, err := readHandshake(stdin); err != nil {
					return err
				}
				return scriptWriteJSONLine(stdout, PluginHandshakeResponse{
					Type: MessageTypeResponse,
					Manifest: PluginManifest{
						PluginID:        "example-plugin",
						PluginVersion:   "1.0.0",
						ProtocolVersion: ProtocolVersionV1,
						ExposedTools:    []string{"plugin.example"},
					},
				})
			},
			wantCode:  FailureCodeHandshakeFailed,
			wantCause: ErrMalformedPluginOutput,
		},
		{
			name: "tool missing from handshake manifest",
			script: func(stdin io.Reader, stdout io.Writer) error {
				if _, err := readHandshake(stdin); err != nil {
					return err
				}
				return scriptWriteJSONLine(stdout, PluginHandshakeResponse{
					Type: MessageTypeHandshake,
					Manifest: PluginManifest{
						PluginID:        "example-plugin",
						PluginVersion:   "1.0.0",
						ProtocolVersion: ProtocolVersionV1,
						ExposedTools:    []string{"plugin.other"},
					},
				})
			},
			wantCode:  FailureCodeToolNotExposed,
			wantCause: ErrMalformedPluginOutput,
		},
		{
			name: "crash during response",
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
					return err
				}
				var executeReq PluginRequest
				return scriptReadJSONLine(reader, &executeReq)
			},
			wantCode:  FailureCodeCrashed,
			wantCause: ErrPluginProcessCrashed,
		},
		{
			name: "malformed response frame",
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
					return err
				}
				var executeReq PluginRequest
				if err := scriptReadJSONLine(reader, &executeReq); err != nil {
					return err
				}
				_, err = io.WriteString(stdout, "{bad json\n")
				return err
			},
			wantCode:  FailureCodeMalformedResponse,
			wantCause: ErrMalformedPluginOutput,
		},
		{
			name: "response request id mismatch",
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
					return err
				}
				var executeReq PluginRequest
				if err := scriptReadJSONLine(reader, &executeReq); err != nil {
					return err
				}
				return scriptWriteJSONLine(stdout, PluginResponse{
					Type:      MessageTypeResponse,
					RequestID: executeReq.RequestID + "-other",
					Status:    PluginResponseStatusOK,
					Output:    json.RawMessage(`{"ok":true}`),
				})
			},
			wantCode:  FailureCodeMalformedResponse,
			wantCause: ErrMalformedPluginOutput,
		},
		{
			name: "success response carries error payload",
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
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
					Output:    json.RawMessage(`{"ok":true}`),
					Error: &PluginError{
						Code:    "invalid_input",
						Message: "should not be present on success",
					},
				})
			},
			wantCode:  FailureCodeMalformedResponse,
			wantCause: ErrMalformedPluginOutput,
		},
		{
			name: "post-response wait error",
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
					return err
				}
				if err := writeSuccessfulResponse(reader, stdout); err != nil {
					return err
				}
				return errors.New("plugin exited non-zero after response")
			},
			wantCode:  FailureCodeCrashed,
			wantCause: ErrPluginProcessCrashed,
		},
		{
			name: "teardown timeout after response",
			spec: PluginSpec{
				TeardownTimeout: 5 * time.Millisecond,
			},
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
					return err
				}
				if err := writeSuccessfulResponse(reader, stdout); err != nil {
					return err
				}
				time.Sleep(30 * time.Millisecond)
				return nil
			},
			wantCode:  FailureCodeCrashed,
			wantCause: ErrPluginProcessCrashed,
		},
		{
			name: "invocation timeout while waiting for exit",
			spec: PluginSpec{
				TeardownTimeout: 200 * time.Millisecond,
			},
			timeout: 10 * time.Millisecond,
			script: func(stdin io.Reader, stdout io.Writer) error {
				reader, err := readHandshake(stdin)
				if err != nil {
					return err
				}
				if err := writeHandshake(stdout); err != nil {
					return err
				}
				if err := writeSuccessfulResponse(reader, stdout); err != nil {
					return err
				}
				time.Sleep(30 * time.Millisecond)
				return nil
			},
			wantCode:  FailureCodeTimeout,
			wantCause: ErrPluginTimeout,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			timeout := tt.timeout
			if timeout == 0 {
				timeout = time.Second
			}
			runtime := NewRuntime(scriptedSpawner{script: tt.script}, timeout)
			spec := tt.spec
			spec.Name = "example-plugin"
			spec.Process = ProcessConfig{Command: "scripted"}

			_, err := runtime.Invoke(context.Background(), spec, InvokeRequest{
				ToolName: "plugin.example",
			})
			if err == nil {
				t.Fatalf("expected failure")
			}
			failure, ok := AsFailure(err)
			if !ok {
				t.Fatalf("expected FailureError, got %T (%v)", err, err)
			}
			if failure.Code != tt.wantCode {
				t.Fatalf("expected code %s, got %s (%v)", tt.wantCode, failure.Code, err)
			}
			if failure.PluginID != "example-plugin" {
				t.Fatalf("expected plugin id to survive chaos failure, got %q (%v)", failure.PluginID, err)
			}
			if !errors.Is(err, tt.wantCause) {
				t.Fatalf("expected cause %v, got %v", tt.wantCause, err)
			}
		})
	}
}
