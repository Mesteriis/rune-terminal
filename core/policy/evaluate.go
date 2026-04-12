package policy

func Evaluate(cfg Config, ctx Context) Decision {
	pipeline := newPipeline(cfg, ctx)
	pipeline.run()
	return pipeline.decision
}
