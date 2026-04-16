package plugins

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type Runtime struct {
	spawner        ProcessSpawner
	defaultTimeout time.Duration
}

const maxProtocolMessageBytes = 1 << 20

func NewRuntime(spawner ProcessSpawner, defaultTimeout time.Duration) *Runtime {
	if spawner == nil {
		spawner = OSProcessSpawner{}
	}
	if defaultTimeout <= 0 {
		defaultTimeout = DefaultInvokeTimeout
	}
	return &Runtime{
		spawner:        spawner,
		defaultTimeout: defaultTimeout,
	}
}

func (r *Runtime) DefaultTimeout() time.Duration {
	return r.defaultTimeout
}

func (r *Runtime) Invoke(ctx context.Context, spec PluginSpec, request InvokeRequest) (InvokeResult, error) {
	if err := validateInvocation(spec, request); err != nil {
		return InvokeResult{}, err
	}

	invokeCtx, cancel := context.WithTimeout(ctx, r.invocationTimeout(spec))
	defer cancel()

	process, err := r.spawner.Spawn(invokeCtx, spec.Process)
	if err != nil {
		if errors.Is(err, ErrProcessSpawnFailed) {
			return InvokeResult{}, err
		}
		return InvokeResult{}, fmt.Errorf("%w: %v", ErrProcessSpawnFailed, err)
	}

	waitCh := make(chan error, 1)
	go func() {
		waitCh <- process.Wait()
	}()

	exchangeCh := make(chan invokeExchangeResult, 1)
	go func() {
		result, err := r.exchangeProtocol(process, spec, request)
		exchangeCh <- invokeExchangeResult{result: result, err: err}
	}()

	select {
	case <-invokeCtx.Done():
		r.killAndWait(process, waitCh)
		return InvokeResult{}, fmt.Errorf("%w: %v", ErrPluginTimeout, invokeCtx.Err())
	case outcome := <-exchangeCh:
		if outcome.err != nil {
			r.killAndWait(process, waitCh)
			return InvokeResult{}, outcome.err
		}
		select {
		case waitErr := <-waitCh:
			if waitErr != nil {
				return InvokeResult{}, fmt.Errorf("%w: %v", ErrPluginProcessCrashed, waitErr)
			}
		case <-invokeCtx.Done():
			r.killAndWait(process, waitCh)
			return InvokeResult{}, fmt.Errorf("%w: %v", ErrPluginTimeout, invokeCtx.Err())
		}
		return outcome.result, nil
	}
}

func (r *Runtime) invocationTimeout(spec PluginSpec) time.Duration {
	if spec.Timeout > 0 {
		return spec.Timeout
	}
	return r.defaultTimeout
}

func validateInvocation(spec PluginSpec, request InvokeRequest) error {
	if strings.TrimSpace(spec.Name) == "" {
		return fmt.Errorf("%w: plugin name is required", ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(spec.Process.Command) == "" {
		return fmt.Errorf("%w: plugin command is required", ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(request.ToolName) == "" {
		return fmt.Errorf("%w: tool name is required", ErrInvalidPluginSpec)
	}
	return nil
}

type invokeExchangeResult struct {
	result InvokeResult
	err    error
}

func (r *Runtime) exchangeProtocol(process Process, spec PluginSpec, request InvokeRequest) (InvokeResult, error) {
	reader := bufio.NewReader(process.Stdout())
	writer := process.Stdin()
	defer writer.Close()

	protocolVersion := strings.TrimSpace(spec.Protocol)
	if protocolVersion == "" {
		protocolVersion = ProtocolVersionV1
	}

	if err := writeJSONLine(writer, PluginHandshakeRequest{
		Type:            MessageTypeHandshake,
		ProtocolVersion: protocolVersion,
	}); err != nil {
		return InvokeResult{}, fmt.Errorf("%w: failed to write handshake: %v", ErrPluginProcessCrashed, err)
	}

	var handshake PluginHandshakeResponse
	if err := readJSONLine(reader, &handshake); err != nil {
		return InvokeResult{}, classifyProtocolReadError(err, "handshake")
	}
	if err := validateHandshakeResponse(handshake, spec, protocolVersion); err != nil {
		return InvokeResult{}, err
	}

	input := request.Input
	if len(input) == 0 {
		input = json.RawMessage(`{}`)
	}
	requestID := ids.New("plugin_req")
	if err := writeJSONLine(writer, PluginRequest{
		Type:      MessageTypeRequest,
		RequestID: requestID,
		ToolName:  request.ToolName,
		Context:   request.Context,
		Input:     input,
	}); err != nil {
		return InvokeResult{}, fmt.Errorf("%w: failed to write execute request: %v", ErrPluginProcessCrashed, err)
	}

	var response PluginResponse
	if err := readJSONLine(reader, &response); err != nil {
		return InvokeResult{}, classifyProtocolReadError(err, "response")
	}
	if err := validatePluginResponse(response, requestID); err != nil {
		return InvokeResult{}, err
	}

	if response.Status == PluginResponseStatusError {
		return InvokeResult{}, &ExecutionError{
			PluginName: handshake.Manifest.PluginID,
			Code:       response.Error.Code,
			Message:    response.Error.Message,
		}
	}

	return InvokeResult{
		Manifest: handshake.Manifest,
		Output:   response.Output,
	}, nil
}

func validateHandshakeResponse(response PluginHandshakeResponse, spec PluginSpec, expectedVersion string) error {
	if response.Type != MessageTypeHandshake {
		return fmt.Errorf("%w: expected handshake message type", ErrMalformedPluginOutput)
	}
	manifest := response.Manifest
	if strings.TrimSpace(manifest.ProtocolVersion) != expectedVersion {
		return fmt.Errorf("%w: protocol version mismatch", ErrMalformedPluginOutput)
	}
	if strings.TrimSpace(manifest.PluginID) == "" {
		return fmt.Errorf("%w: plugin_id is required in handshake manifest", ErrMalformedPluginOutput)
	}
	if strings.TrimSpace(manifest.PluginVersion) == "" {
		return fmt.Errorf("%w: plugin_version is required in handshake manifest", ErrMalformedPluginOutput)
	}
	if len(manifest.ExposedTools) == 0 {
		return fmt.Errorf("%w: exposed_tools is required in handshake manifest", ErrMalformedPluginOutput)
	}
	if strings.TrimSpace(spec.Name) != "" && manifest.PluginID != spec.Name {
		return fmt.Errorf("%w: plugin_id does not match bound plugin spec", ErrMalformedPluginOutput)
	}
	return nil
}

func validatePluginResponse(response PluginResponse, expectedRequestID string) error {
	if response.Type != MessageTypeResponse {
		return fmt.Errorf("%w: expected response message type", ErrMalformedPluginOutput)
	}
	if response.RequestID != expectedRequestID {
		return fmt.Errorf("%w: response request_id mismatch", ErrMalformedPluginOutput)
	}
	switch response.Status {
	case PluginResponseStatusOK:
		if response.Error != nil {
			return fmt.Errorf("%w: success response must not include error payload", ErrMalformedPluginOutput)
		}
	case PluginResponseStatusError:
		if response.Error == nil || strings.TrimSpace(response.Error.Message) == "" {
			return fmt.Errorf("%w: error response requires error payload", ErrMalformedPluginOutput)
		}
	default:
		return fmt.Errorf("%w: unknown response status", ErrMalformedPluginOutput)
	}
	return nil
}

func readJSONLine(reader *bufio.Reader, target any) error {
	line, err := reader.ReadBytes('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	line = bytes.TrimSpace(line)
	if len(line) == 0 {
		if errors.Is(err, io.EOF) {
			return io.EOF
		}
		return fmt.Errorf("%w: empty protocol frame", ErrMalformedPluginOutput)
	}
	if len(line) > maxProtocolMessageBytes {
		return fmt.Errorf("%w: protocol frame too large", ErrMalformedPluginOutput)
	}
	if unmarshalErr := json.Unmarshal(line, target); unmarshalErr != nil {
		return fmt.Errorf("%w: %v", ErrMalformedPluginOutput, unmarshalErr)
	}
	return nil
}

func writeJSONLine(writer io.Writer, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	payload = append(payload, '\n')
	if _, err := writer.Write(payload); err != nil {
		return err
	}
	return nil
}

func classifyProtocolReadError(err error, step string) error {
	if errors.Is(err, ErrMalformedPluginOutput) {
		return err
	}
	if errors.Is(err, io.EOF) {
		return fmt.Errorf("%w: plugin closed stdout during %s", ErrPluginProcessCrashed, step)
	}
	return fmt.Errorf("%w: failed to read %s: %v", ErrPluginProcessCrashed, step, err)
}

func (r *Runtime) killAndWait(process Process, waitCh <-chan error) {
	_ = process.Kill()
	select {
	case <-waitCh:
	case <-time.After(2 * time.Second):
	}
}
