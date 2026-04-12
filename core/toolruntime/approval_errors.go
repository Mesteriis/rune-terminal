package toolruntime

import "errors"

var (
	ErrPendingApprovalNotFound = errors.New("pending approval not found")
	ErrPendingApprovalExpired  = errors.New("pending approval expired")
)
