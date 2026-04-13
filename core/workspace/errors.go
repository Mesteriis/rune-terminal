package workspace

import "errors"

var ErrWidgetNotFound = errors.New("widget not found")
var ErrTabNotFound = errors.New("tab not found")
var ErrCannotCloseLastTab = errors.New("cannot close last tab")
var ErrInvalidTabName = errors.New("invalid tab name")
var ErrInvalidTabMove = errors.New("invalid tab move")
