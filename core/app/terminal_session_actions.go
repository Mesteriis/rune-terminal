package app

import (
	"context"
	"errors"
	"fmt"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func (r *Runtime) RestartTerminalSession(ctx context.Context, widgetID string) (terminal.State, error) {
	widget, err := r.findWorkspaceWidget(widgetID)
	if err != nil {
		return terminal.State{}, err
	}
	if widget.Kind != workspace.WidgetKindTerminal {
		return terminal.State{}, fmt.Errorf("%w: %s", terminal.ErrWidgetNotFound, widgetID)
	}

	connection, err := r.connectionForWidget(widget.ConnectionID)
	if err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		return terminal.State{}, err
	}
	if err := r.Terminals.CloseSession(widgetID); err != nil && !errors.Is(err, terminal.ErrWidgetNotFound) {
		return terminal.State{}, err
	}
	state, err := r.Terminals.StartSession(ctx, terminal.LaunchOptions{
		WidgetID:   widget.ID,
		WorkingDir: r.RepoRoot,
		Connection: connection,
	})
	if err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		return terminal.State{}, err
	}
	if err := r.observeConnectionLaunch(ctx, widget.ID, connection); err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		_ = r.Terminals.CloseSession(widget.ID)
		return terminal.State{}, err
	}
	_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, nil)
	return state, nil
}

func (r *Runtime) findWorkspaceWidget(widgetID string) (workspace.Widget, error) {
	for _, widget := range r.Workspace.Snapshot().Widgets {
		if widget.ID == widgetID {
			return widget, nil
		}
	}
	return workspace.Widget{}, fmt.Errorf("%w: %s", terminal.ErrWidgetNotFound, widgetID)
}
