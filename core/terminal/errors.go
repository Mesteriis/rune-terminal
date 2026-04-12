package terminal

import "errors"

var (
	ErrWidgetNotFound  = errors.New("terminal widget not found")
	ErrCannotSendInput = errors.New("terminal cannot accept input")
	ErrCannotInterrupt = errors.New("terminal cannot be interrupted")
)
