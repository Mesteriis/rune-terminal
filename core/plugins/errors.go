package plugins

import "errors"

var (
	ErrInvalidPluginSpec     = errors.New("invalid plugin specification")
	ErrProcessSpawnFailed    = errors.New("failed to spawn plugin process")
	ErrPluginTimeout         = errors.New("plugin process timed out")
	ErrPluginProcessCrashed  = errors.New("plugin process crashed")
	ErrMalformedPluginOutput = errors.New("plugin returned malformed output")
)

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
