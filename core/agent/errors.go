package agent

import "errors"

var (
	ErrPromptProfileNotFound = errors.New("prompt profile not found")
	ErrRolePresetNotFound    = errors.New("role preset not found")
	ErrWorkModeNotFound      = errors.New("work mode not found")
)
