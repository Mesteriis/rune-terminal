package policy

func approvalStage(p *evaluationPipeline) bool {
	switch p.decision.EffectiveApprovalTier {
	case ApprovalTierDangerous, ApprovalTierDestructive:
		if p.ctx.HasApproval || p.decision.AutoApproved {
			return false
		}
		p.decision.Allowed = false
		p.decision.RequiresConfirmation = true
		p.decision.Reason = "approval_required"
		return true
	default:
		return false
	}
}

func effectiveApprovalTier(base ApprovalTier, overlay ApprovalOverlay, mutating bool) ApprovalTier {
	tier := base
	if mutating && overlay.MinimumMutationTier != "" {
		tier = maxTier(tier, overlay.MinimumMutationTier)
	}
	for i := 0; i < overlay.EscalateBy; i++ {
		tier = escalateTier(tier)
	}
	return tier
}

func maxTier(current ApprovalTier, next ApprovalTier) ApprovalTier {
	if approvalTierRank(next) > approvalTierRank(current) {
		return next
	}
	return current
}

func escalateTier(tier ApprovalTier) ApprovalTier {
	switch tier {
	case ApprovalTierSafe:
		return ApprovalTierModerate
	case ApprovalTierModerate:
		return ApprovalTierDangerous
	case ApprovalTierDangerous:
		return ApprovalTierDestructive
	default:
		return ApprovalTierDestructive
	}
}

func approvalTierRank(tier ApprovalTier) int {
	switch tier {
	case ApprovalTierModerate:
		return 1
	case ApprovalTierDangerous:
		return 2
	case ApprovalTierDestructive:
		return 3
	default:
		return 0
	}
}
