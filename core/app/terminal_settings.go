package app

import (
	"context"
	"fmt"

	"github.com/Mesteriis/rune-terminal/core/terminal"
)

func (r *Runtime) TerminalSettings(ctx context.Context) (terminal.Preferences, error) {
	if r.TerminalPreferences == nil {
		return terminal.Preferences{}, fmt.Errorf("terminal preferences store is not configured")
	}

	return r.TerminalPreferences.Snapshot(ctx)
}

func (r *Runtime) UpdateTerminalSettings(
	ctx context.Context,
	preferences terminal.Preferences,
) (terminal.Preferences, error) {
	if r.TerminalPreferences == nil {
		return terminal.Preferences{}, fmt.Errorf("terminal preferences store is not configured")
	}

	return r.TerminalPreferences.Update(ctx, preferences)
}
