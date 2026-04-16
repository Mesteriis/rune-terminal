package app

import (
	"context"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

func (r *Runtime) toolPolicyProfile() policy.EvaluationProfile {
	if r.Agent == nil {
		return policy.EvaluationProfile{}
	}
	return r.Agent.PolicyProfile()
}

func (r *Runtime) ExecuteTool(ctx context.Context, request toolruntime.ExecuteRequest) toolruntime.ExecuteResponse {
	return r.Executor.Execute(ctx, request, r.toolPolicyProfile())
}
