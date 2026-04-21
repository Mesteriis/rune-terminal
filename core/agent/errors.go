package agent

import "errors"

var (
	ErrPromptProfileNotFound   = errors.New("prompt profile not found")
	ErrRolePresetNotFound      = errors.New("role preset not found")
	ErrWorkModeNotFound        = errors.New("work mode not found")
	ErrProviderNotFound        = errors.New("provider not found")
	ErrProviderKindUnsupported = errors.New("provider kind unsupported")
	ErrProviderInvalidConfig   = errors.New("provider config invalid")
	ErrProviderDisabled        = errors.New("provider disabled")
	ErrProviderDeleteActive    = errors.New("active provider cannot be deleted")
)
