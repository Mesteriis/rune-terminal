package app

import (
	"errors"

	agentcore "github.com/avm/rterm/core/agent"
	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/terminal"
	"github.com/avm/rterm/core/toolruntime"
	"github.com/avm/rterm/core/workspace"
)

func normalizeToolError(err error) error {
	if err == nil {
		return nil
	}

	switch {
	case errors.Is(err, workspace.ErrWidgetNotFound),
		errors.Is(err, workspace.ErrTabNotFound),
		errors.Is(err, terminal.ErrWidgetNotFound),
		errors.Is(err, toolruntime.ErrPendingApprovalNotFound),
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
		errors.Is(err, toolruntime.ErrPendingApprovalExpired):
		return toolruntime.InvalidInputError(err.Error())
	default:
		return toolruntime.InternalError(err.Error(), err)
	}
}
