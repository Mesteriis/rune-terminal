package terminal

import "errors"

var (
	ErrWidgetNotFound         = errors.New("terminal widget not found")
	ErrSessionNotFound        = errors.New("terminal session not found")
	ErrCommandNotFound        = errors.New("terminal command not found")
	ErrCannotSendInput        = errors.New("terminal cannot accept input")
	ErrCannotInterrupt        = errors.New("terminal cannot be interrupted")
	ErrCannotCloseLastSession = errors.New("terminal cannot close the last session in a widget")
)
