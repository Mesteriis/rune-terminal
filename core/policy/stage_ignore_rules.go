package policy

import "path/filepath"

func ignoreRulesStage(p *evaluationPipeline) bool {
	if !p.ctx.ChecksIgnoreRules {
		return false
	}
	for _, rule := range p.cfg.IgnoreRules {
		if !ignoreRuleApplies(rule, p.ctx) {
			continue
		}
		p.decision.MatchedIgnoreRuleID = rule.ID
		p.decision.IgnoreMode = rule.Mode
		if rule.Mode == IgnoreModeDeny && !p.ctx.HasApproval {
			p.decision.Allowed = false
			p.decision.RequiresConfirmation = true
			p.decision.Reason = "ignore_rule_confirmation_required"
			return true
		}
		return false
	}
	return false
}

func ignoreRuleApplies(rule IgnoreRule, ctx Context) bool {
	if !rule.Enabled || !scopeMatches(rule.Scope, rule.ScopeRef, ctx) {
		return false
	}
	for _, path := range ctx.AffectedPaths {
		if matchString(rule.MatcherType, rule.Pattern, filepath.Base(path)) || matchString(rule.MatcherType, rule.Pattern, path) {
			return true
		}
	}
	return false
}
