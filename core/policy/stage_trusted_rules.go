package policy

func trustedRulesStage(p *evaluationPipeline) bool {
	for _, rule := range p.cfg.TrustedRules {
		if !trustedRuleApplies(rule, p.ctx) {
			continue
		}
		p.decision.MatchedTrustedRuleID = rule.ID
		if !p.ctx.EvaluationProfile.DisableTrustedAutoApprove && p.decision.EffectiveApprovalTier != ApprovalTierDestructive {
			p.decision.AutoApproved = true
		}
		return false
	}
	return false
}

func trustedRuleApplies(rule TrustedRule, ctx Context) bool {
	if !rule.Enabled || !scopeMatches(rule.Scope, rule.ScopeRef, ctx) {
		return false
	}
	if rule.MatcherType == MatcherStructured {
		return matchStructured(rule.Structured, ctx)
	}
	switch rule.SubjectType {
	case SubjectTool:
		return matchString(rule.MatcherType, rule.Matcher, ctx.ToolName)
	case SubjectCommand:
		return matchString(rule.MatcherType, rule.Matcher, ctx.Summary)
	case SubjectPath:
		for _, path := range ctx.AffectedPaths {
			if matchString(rule.MatcherType, rule.Matcher, path) {
				return true
			}
		}
	}
	return false
}
