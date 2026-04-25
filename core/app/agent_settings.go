package app

import (
	"context"
	"fmt"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

func (r *Runtime) AgentSettings(ctx context.Context) (agent.ComposerPreferences, error) {
	if r.AgentComposerPreferences == nil {
		return agent.ComposerPreferences{}, fmt.Errorf("agent composer preferences store is not configured")
	}

	return r.AgentComposerPreferences.Snapshot(ctx)
}

func (r *Runtime) UpdateAgentSettings(
	ctx context.Context,
	preferences agent.ComposerPreferences,
) (agent.ComposerPreferences, error) {
	if r.AgentComposerPreferences == nil {
		return agent.ComposerPreferences{}, fmt.Errorf("agent composer preferences store is not configured")
	}

	return r.AgentComposerPreferences.Update(ctx, preferences)
}
