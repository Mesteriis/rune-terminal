package toolruntime

import "errors"

type codedError struct {
	code    ErrorCode
	message string
	err     error
}

func (e *codedError) Error() string {
	return e.message
}

func (e *codedError) Unwrap() error {
	return e.err
}

func InvalidInputError(message string) error {
	return &codedError{code: ErrorCodeInvalidInput, message: message}
}

func NotFoundError(message string) error {
	return &codedError{code: ErrorCodeNotFound, message: message}
}

func InternalError(message string, err error) error {
	return &codedError{code: ErrorCodeInternalError, message: message, err: err}
}

func ErrorCodeOf(err error) ErrorCode {
	var coded *codedError
	if errors.As(err, &coded) {
		return coded.code
	}
	return ErrorCodeInternalError
}

func ErrorMessageOf(err error) string {
	var coded *codedError
	if errors.As(err, &coded) && coded.message != "" {
		return coded.message
	}
	if err == nil {
		return ""
	}
	return err.Error()
}
