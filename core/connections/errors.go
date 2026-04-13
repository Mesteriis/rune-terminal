package connections

import "errors"

var (
	ErrConnectionNotFound = errors.New("connection not found")
	ErrInvalidConnection  = errors.New("invalid connection")
)
