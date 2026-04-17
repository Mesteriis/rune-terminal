package app

import (
	"errors"

	agentcore "github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func normalizeToolError(err error) error {
	if err == nil {
		return nil
	}

	switch {
	case errors.Is(err, workspace.ErrWidgetNotFound),
		errors.Is(err, workspace.ErrTabNotFound),
		errors.Is(err, workspace.ErrLayoutNotFound),
		errors.Is(err, terminal.ErrWidgetNotFound),
		errors.Is(err, toolruntime.ErrPendingApprovalNotFound),
		errors.Is(err, connections.ErrConnectionNotFound),
		errors.Is(err, agentcore.ErrPromptProfileNotFound),
		errors.Is(err, agentcore.ErrRolePresetNotFound),
		errors.Is(err, agentcore.ErrWorkModeNotFound):
		return toolruntime.NotFoundError(err.Error())
	case errors.Is(err, terminal.ErrCannotSendInput),
		errors.Is(err, terminal.ErrCannotInterrupt),
		errors.Is(err, workspace.ErrCannotCloseLastTab),
		errors.Is(err, workspace.ErrInvalidTabName),
		errors.Is(err, workspace.ErrInvalidTabMove),
		errors.Is(err, policy.ErrInvalidTrustedRule),
		errors.Is(err, policy.ErrInvalidIgnoreRule),
		errors.Is(err, connections.ErrInvalidConnection),
		errors.Is(err, toolruntime.ErrPendingApprovalExpired):
		return toolruntime.InvalidInputError(err.Error())
	default:
		return toolruntime.InternalError(err.Error(), err)
	}
}
