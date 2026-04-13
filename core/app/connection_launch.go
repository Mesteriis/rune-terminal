package app

import (
	"context"
	"fmt"
	"time"

	"github.com/Mesteriis/rune-terminal/core/terminal"
)

const sshLaunchProbeWindow = 1500 * time.Millisecond

func (r *Runtime) observeConnectionLaunch(ctx context.Context, widgetID string, connection terminal.ConnectionSpec) error {
	if connection.Kind != "ssh" {
		return nil
	}
	_, err := r.Terminals.ObserveLaunch(ctx, widgetID, sshLaunchProbeWindow)
	if err == nil {
		return nil
	}
	target := connection.Name
	if target == "" {
		target = connection.ID
	}
	if target == "" {
		target = "ssh target"
	}
	return fmt.Errorf("failed to open shell on %s: %w", target, err)
}
