package toolruntime

import "github.com/Mesteriis/rune-terminal/core/audit"

func (e *Executor) appendAudit(prepared *preparedExecution, request ExecuteRequest, success bool, errorText string) {
	_ = e.audit.Append(audit.Event{
		ToolName:              prepared.definition.Name,
		Summary:               prepared.plan.Summary,
		WorkspaceID:           request.Context.WorkspaceID,
		PromptProfileID:       prepared.decision.PromptProfileID,
		RoleID:                prepared.decision.RoleID,
		ModeID:                prepared.decision.ModeID,
		SecurityPosture:       prepared.decision.SecurityPosture,
		ApprovalTier:          string(prepared.plan.ApprovalTier),
		EffectiveApprovalTier: string(prepared.decision.EffectiveApprovalTier),
		TrustedRuleID:         prepared.decision.MatchedTrustedRuleID,
		IgnoreRuleID:          prepared.decision.MatchedIgnoreRuleID,
		IgnoreMode:            string(prepared.decision.IgnoreMode),
		Success:               success,
		Error:                 errorText,
		ApprovalUsed:          prepared.hasApproval,
		AffectedPaths:         prepared.plan.AffectedPaths,
		AffectedWidgets:       prepared.plan.AffectedWidgets,
	})
}
