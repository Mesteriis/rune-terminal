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
	spawner                 ProcessSpawner
	defaultTimeout          time.Duration
	defaultLaunchTimeout    time.Duration
	defaultHandshakeTimeout time.Duration
	defaultTeardownTimeout  time.Duration
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
		spawner:                 spawner,
		defaultTimeout:          defaultTimeout,
		defaultLaunchTimeout:    DefaultLaunchTimeout,
		defaultHandshakeTimeout: DefaultHandshakeTimeout,
		defaultTeardownTimeout:  DefaultTeardownTimeout,
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

	spawnStartedAt := time.Now()
	process, err := r.spawner.Spawn(invokeCtx, spec.Process)
	if err != nil {
		return InvokeResult{}, newFailure(
			FailureCodeLaunchFailed,
			spec.Name,
			"failed to start plugin process",
			fmt.Errorf("%w: %v", ErrProcessSpawnFailed, err),
		)
	}
	if startupDuration := time.Since(spawnStartedAt); startupDuration > r.launchTimeout(spec) {
		waitCh := make(chan error, 1)
		go func() {
			waitCh <- process.Wait()
		}()
		r.killAndWait(process, waitCh)
		return InvokeResult{}, newFailure(
			FailureCodeLaunchFailed,
			spec.Name,
			fmt.Sprintf("process startup exceeded %s", r.launchTimeout(spec)),
			ErrProcessSpawnFailed,
		)
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
		return InvokeResult{}, newFailure(
			FailureCodeTimeout,
			spec.Name,
			"plugin invocation timed out",
			fmt.Errorf("%w: %v", ErrPluginTimeout, invokeCtx.Err()),
		)
	case outcome := <-exchangeCh:
		if outcome.err != nil {
			r.killAndWait(process, waitCh)
			return InvokeResult{}, outcome.err
		}

		if err := r.waitForExit(invokeCtx, process, waitCh, r.teardownTimeout(spec)); err != nil {
			return InvokeResult{}, err
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

func (r *Runtime) launchTimeout(spec PluginSpec) time.Duration {
	if spec.LaunchTimeout > 0 {
		return spec.LaunchTimeout
	}
	return r.defaultLaunchTimeout
}

func (r *Runtime) handshakeTimeout(spec PluginSpec) time.Duration {
	if spec.HandshakeTimeout > 0 {
		return spec.HandshakeTimeout
	}
	return r.defaultHandshakeTimeout
}

func (r *Runtime) teardownTimeout(spec PluginSpec) time.Duration {
	if spec.TeardownTimeout > 0 {
		return spec.TeardownTimeout
	}
	return r.defaultTeardownTimeout
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
		return InvokeResult{}, newFailure(
			FailureCodeHandshakeFailed,
			spec.Name,
			"failed to write handshake request to plugin",
			fmt.Errorf("%w: failed to write handshake: %v", ErrPluginProcessCrashed, err),
		)
	}

	var handshake PluginHandshakeResponse
	if err := readJSONLineWithTimeout(reader, &handshake, r.handshakeTimeout(spec)); err != nil {
		if errors.Is(err, ErrPluginTimeout) {
			return InvokeResult{}, newFailure(
				FailureCodeTimeout,
				spec.Name,
				"plugin handshake timed out",
				err,
			)
		}
		return InvokeResult{}, classifyProtocolReadError(err, spec.Name, "handshake")
	}
	if err := validateHandshakeResponse(handshake, spec, protocolVersion, request.ToolName); err != nil {
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
		return InvokeResult{}, newFailure(
			FailureCodeCrashed,
			handshake.Manifest.PluginID,
			"failed to write execute request to plugin",
			fmt.Errorf("%w: %v", ErrPluginProcessCrashed, err),
		)
	}

	var response PluginResponse
	if err := readJSONLine(reader, &response); err != nil {
		return InvokeResult{}, classifyProtocolReadError(err, handshake.Manifest.PluginID, "response")
	}
	if err := validatePluginResponse(response, requestID, handshake.Manifest.PluginID); err != nil {
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

func validateHandshakeResponse(
	response PluginHandshakeResponse,
	spec PluginSpec,
	expectedVersion string,
	requestedToolName string,
) error {
	if response.Type != MessageTypeHandshake {
		return newFailure(
			FailureCodeHandshakeFailed,
			spec.Name,
			"expected handshake message type",
			ErrMalformedPluginOutput,
		)
	}
	manifest := response.Manifest
	if strings.TrimSpace(manifest.ProtocolVersion) != expectedVersion {
		return newFailure(
			FailureCodeProtocolVersionMismatch,
			manifest.PluginID,
			fmt.Sprintf("expected protocol_version %q, got %q", expectedVersion, manifest.ProtocolVersion),
			ErrMalformedPluginOutput,
		)
	}
	if strings.TrimSpace(manifest.PluginID) == "" {
		return newFailure(
			FailureCodeHandshakeFailed,
			spec.Name,
			"plugin_id is required in handshake manifest",
			ErrMalformedPluginOutput,
		)
	}
	if strings.TrimSpace(manifest.PluginVersion) == "" {
		return newFailure(
			FailureCodeHandshakeFailed,
			manifest.PluginID,
			"plugin_version is required in handshake manifest",
			ErrMalformedPluginOutput,
		)
	}
	if len(manifest.ExposedTools) == 0 {
		return newFailure(
			FailureCodeHandshakeFailed,
			manifest.PluginID,
			"exposed_tools is required in handshake manifest",
			ErrMalformedPluginOutput,
		)
	}
	if strings.TrimSpace(spec.Name) != "" && manifest.PluginID != spec.Name {
		return newFailure(
			FailureCodeHandshakeFailed,
			manifest.PluginID,
			"plugin_id does not match bound plugin spec",
			ErrMalformedPluginOutput,
		)
	}
	if !containsString(manifest.ExposedTools, requestedToolName) {
		return newFailure(
			FailureCodeToolNotExposed,
			manifest.PluginID,
			"requested tool is not exposed by plugin manifest",
			ErrMalformedPluginOutput,
		)
	}
	return nil
}

func validatePluginResponse(response PluginResponse, expectedRequestID string, pluginID string) error {
	if response.Type != MessageTypeResponse {
		return newFailure(
			FailureCodeMalformedResponse,
			pluginID,
			"expected response message type",
			ErrMalformedPluginOutput,
		)
	}
	if response.RequestID != expectedRequestID {
		return newFailure(
			FailureCodeMalformedResponse,
			pluginID,
			"response request_id mismatch",
			ErrMalformedPluginOutput,
		)
	}
	switch response.Status {
	case PluginResponseStatusOK:
		if response.Error != nil {
			return newFailure(
				FailureCodeMalformedResponse,
				pluginID,
				"success response must not include error payload",
				ErrMalformedPluginOutput,
			)
		}
	case PluginResponseStatusError:
		if response.Error == nil || strings.TrimSpace(response.Error.Message) == "" {
			return newFailure(
				FailureCodeMalformedResponse,
				pluginID,
				"error response requires error payload",
				ErrMalformedPluginOutput,
			)
		}
	default:
		return newFailure(
			FailureCodeMalformedResponse,
			pluginID,
			"unknown response status",
			ErrMalformedPluginOutput,
		)
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

func readJSONLineWithTimeout(reader *bufio.Reader, target any, timeout time.Duration) error {
	if timeout <= 0 {
		return readJSONLine(reader, target)
	}
	resultCh := make(chan error, 1)
	go func() {
		resultCh <- readJSONLine(reader, target)
	}()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case err := <-resultCh:
		return err
	case <-timer.C:
		return fmt.Errorf("%w: timed out waiting for plugin protocol message", ErrPluginTimeout)
	}
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

func classifyProtocolReadError(err error, pluginID string, step string) error {
	if failure, ok := AsFailure(err); ok {
		return failure
	}
	if errors.Is(err, ErrMalformedPluginOutput) {
		return newFailure(
			FailureCodeMalformedResponse,
			pluginID,
			fmt.Sprintf("plugin returned malformed %s payload", step),
			err,
		)
	}
	if errors.Is(err, ErrPluginTimeout) {
		return newFailure(
			FailureCodeTimeout,
			pluginID,
			fmt.Sprintf("plugin %s timed out", step),
			err,
		)
	}
	if errors.Is(err, io.EOF) {
		return newFailure(
			FailureCodeCrashed,
			pluginID,
			fmt.Sprintf("plugin closed stdout during %s", step),
			fmt.Errorf("%w: plugin closed stdout during %s", ErrPluginProcessCrashed, step),
		)
	}
	return newFailure(
		FailureCodeCrashed,
		pluginID,
		fmt.Sprintf("failed to read %s from plugin", step),
		fmt.Errorf("%w: failed to read %s: %v", ErrPluginProcessCrashed, step, err),
	)
}

func (r *Runtime) killAndWait(process Process, waitCh <-chan error) {
	_ = process.Stdin().Close()
	_ = process.Stdout().Close()
	_ = process.Kill()
	select {
	case <-waitCh:
	case <-time.After(2 * time.Second):
	}
}

func (r *Runtime) waitForExit(
	invokeCtx context.Context,
	process Process,
	waitCh <-chan error,
	teardownTimeout time.Duration,
) error {
	timer := time.NewTimer(teardownTimeout)
	defer timer.Stop()

	select {
	case waitErr := <-waitCh:
		if waitErr != nil {
			return newFailure(
				FailureCodeCrashed,
				"",
				"plugin process exited with error",
				fmt.Errorf("%w: %v", ErrPluginProcessCrashed, waitErr),
			)
		}
		return nil
	case <-timer.C:
		r.killAndWait(process, waitCh)
		return newFailure(
			FailureCodeCrashed,
			"",
			"plugin did not exit within teardown timeout",
			ErrPluginProcessCrashed,
		)
	case <-invokeCtx.Done():
		r.killAndWait(process, waitCh)
		return newFailure(
			FailureCodeTimeout,
			"",
			"plugin invocation timed out while waiting for process exit",
			fmt.Errorf("%w: %v", ErrPluginTimeout, invokeCtx.Err()),
		)
	}
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}
