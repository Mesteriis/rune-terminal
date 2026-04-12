package policy

import "errors"

var (
	ErrInvalidTrustedRule = errors.New("invalid trusted rule")
	ErrInvalidIgnoreRule  = errors.New("invalid ignore rule")
)
