package toolruntime

import "github.com/Mesteriis/rune-terminal/core/audit"

func (e *Executor) appendAudit(prepared *preparedExecution, success bool, errorText string) {
	_ = e.audit.Append(audit.Event{
		ToolName:              prepared.definition.Name,
		Summary:               prepared.plan.Summary,
		WorkspaceID:           prepared.envelope.Context.WorkspaceID,
		PromptProfileID:       prepared.profile.PromptProfileID,
		RoleID:                prepared.envelope.Context.Role,
		ModeID:                prepared.envelope.Context.Mode,
		SecurityPosture:       prepared.profile.SecurityPosture,
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
