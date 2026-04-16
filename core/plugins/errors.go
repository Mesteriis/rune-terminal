package plugins

import "errors"

var (
	ErrInvalidPluginSpec      = errors.New("invalid plugin specification")
	ErrProcessSpawnFailed     = errors.New("failed to spawn plugin process")
	ErrPluginTimeout          = errors.New("plugin process timed out")
	ErrPluginProcessCrashed   = errors.New("plugin process crashed")
	ErrMalformedPluginOutput  = errors.New("plugin returned malformed output")
	ErrProtocolNotImplemented = errors.New("plugin protocol invocation is not implemented")
)
