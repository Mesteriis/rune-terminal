package conversation

import "errors"

var (
	ErrInvalidPrompt         = errors.New("invalid prompt")
	ErrInvalidMessage        = errors.New("invalid message")
	ErrInvalidAttachmentPath = errors.New("invalid attachment path")
	ErrAttachmentNotFound    = errors.New("attachment not found")
	ErrAttachmentNotFile     = errors.New("attachment is not a file")
)
