package policy

type stageFn func(*evaluationPipeline) bool

type evaluationPipeline struct {
	cfg      Config
	ctx      Context
	decision Decision
}

func newPipeline(cfg Config, ctx Context) *evaluationPipeline {
	decision := Decision{
		Allowed:               true,
		AllowedRoots:          normalizeRoots(cfg.AllowedRoots),
		PromptProfileID:       ctx.EvaluationProfile.PromptProfileID,
		RoleID:                ctx.EvaluationProfile.RoleID,
		ModeID:                ctx.EvaluationProfile.ModeID,
		SecurityPosture:       ctx.EvaluationProfile.SecurityPosture,
		EffectiveCapabilities: effectiveCapabilities(cfg.DefaultCapabilities, ctx.EvaluationProfile.CapabilityOverlay),
		EffectiveApprovalTier: effectiveApprovalTier(ctx.ApprovalTier, ctx.EvaluationProfile.ApprovalOverlay, ctx.Mutating),
	}
	return &evaluationPipeline{cfg: cfg, ctx: ctx, decision: decision}
}

func (p *evaluationPipeline) run() {
	stages := []stageFn{
		capabilityStage,
		allowedRootsStage,
		ignoreRulesStage,
		trustedRulesStage,
		approvalStage,
	}
	for _, stage := range stages {
		if stop := stage(p); stop {
			return
		}
	}
}
