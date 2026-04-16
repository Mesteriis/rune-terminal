package conversation

import "errors"

var (
	ErrInvalidPrompt  = errors.New("invalid prompt")
	ErrInvalidMessage = errors.New("invalid message")
)
