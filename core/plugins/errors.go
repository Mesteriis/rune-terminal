package plugins

import "errors"

var (
	ErrInvalidPluginSpec     = errors.New("invalid plugin specification")
	ErrProcessSpawnFailed    = errors.New("failed to spawn plugin process")
	ErrPluginTimeout         = errors.New("plugin process timed out")
	ErrPluginProcessCrashed  = errors.New("plugin process crashed")
	ErrMalformedPluginOutput = errors.New("plugin returned malformed output")
)

type FailureCode string

const (
	FailureCodeLaunchFailed            FailureCode = "launch_failed"
	FailureCodeHandshakeFailed         FailureCode = "handshake_failed"
	FailureCodeTimeout                 FailureCode = "timeout"
	FailureCodeCrashed                 FailureCode = "crashed"
	FailureCodeMalformedResponse       FailureCode = "malformed_response"
	FailureCodeToolNotExposed          FailureCode = "tool_not_exposed"
	FailureCodeProtocolVersionMismatch FailureCode = "protocol_version_mismatch"
)

type FailureError struct {
	Code     FailureCode
	PluginID string
	Message  string
	Cause    error
}

func (e *FailureError) Error() string {
	if e == nil {
		return ""
	}
	if e.Message == "" {
		return string(e.Code)
	}
	return string(e.Code) + ": " + e.Message
}

func (e *FailureError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func AsFailure(err error) (*FailureError, bool) {
	var failure *FailureError
	if !errors.As(err, &failure) {
		return nil, false
	}
	return failure, true
}

func newFailure(code FailureCode, pluginID string, message string, cause error) error {
	return &FailureError{
		Code:     code,
		PluginID: pluginID,
		Message:  message,
		Cause:    cause,
	}
}

type ExecutionError struct {
	PluginName string
	Code       string
	Message    string
}

func (e *ExecutionError) Error() string {
	if e == nil {
		return ""
	}
	if e.Code == "" {
		return "plugin execution failed: " + e.Message
	}
	return "plugin execution failed (" + e.Code + "): " + e.Message
}
