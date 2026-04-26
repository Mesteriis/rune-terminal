package app

import (
	"context"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

func (r *Runtime) bootstrapProviderRoutes(ctx context.Context) {
	if r == nil || r.Agent == nil {
		return
	}

	activeProvider, err := r.Agent.ActiveProvider()
	if err != nil {
		return
	}
	if activeProvider.RoutePolicy.PrewarmPolicy != agent.ProviderPrewarmPolicyOnStartup {
		return
	}
	_, _ = r.PrewarmProvider(ctx, strings.TrimSpace(activeProvider.ID))
}
