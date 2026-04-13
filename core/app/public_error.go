package app

import "github.com/avm/rterm/core/toolruntime"

type PublicError struct {
	Code    string
	Message string
	Err     error
}

func (e PublicError) Error() string {
	return e.Message
}

func (e PublicError) Unwrap() error {
	return e.Err
}

func NormalizePublicError(err error) PublicError {
	normalized := normalizeToolError(err)
	code := toolruntime.ErrorCodeOf(normalized)
	return PublicError{
		Code:    string(code),
		Message: toolruntime.ErrorMessageOf(normalized),
		Err:     err,
	}
}
