package app

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
	"github.com/Mesteriis/rune-terminal/internal/ids"
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
		r.setRestoredTerminalState(r.disconnectedState(widget, terminal.ConnectionSpec{}, err))
		return terminal.State{}, err
	}

	activeSessionID := widget.ID
	if activeState, stateErr := r.Terminals.GetState(widgetID); stateErr == nil && strings.TrimSpace(activeState.SessionID) != "" {
		activeSessionID = activeState.SessionID
	}
	if err := r.Terminals.CloseWidgetSession(widgetID, activeSessionID); err != nil &&
		!errors.Is(err, terminal.ErrWidgetNotFound) &&
		!errors.Is(err, terminal.ErrSessionNotFound) {
		return terminal.State{}, err
	}
	launchOptions := terminal.LaunchOptions{
		WidgetID:   widget.ID,
		SessionID:  activeSessionID,
		WorkingDir: r.RepoRoot,
		Connection: connection,
	}
	var state terminal.State
	if _, stateErr := r.Terminals.GetState(widgetID); errors.Is(stateErr, terminal.ErrWidgetNotFound) {
		state, err = r.Terminals.StartSession(ctx, launchOptions)
	} else {
		state, err = r.Terminals.CreateSession(ctx, launchOptions)
	}
	if err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		r.setRestoredTerminalState(r.disconnectedState(widget, connection, err))
		return terminal.State{}, err
	}
	if err := r.observeConnectionLaunch(ctx, widget.ID, connection); err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		_ = r.Terminals.CloseWidgetSession(widget.ID, activeSessionID)
		r.setRestoredTerminalState(r.disconnectedState(widget, connection, err))
		return terminal.State{}, err
	}
	_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, nil)
	r.clearRestoredTerminalState(widget.ID)
	return state, nil
}

func (r *Runtime) CreateTerminalSiblingSession(ctx context.Context, widgetID string) (terminal.Snapshot, error) {
	widget, err := r.findWorkspaceWidget(widgetID)
	if err != nil {
		return terminal.Snapshot{}, err
	}
	if widget.Kind != workspace.WidgetKindTerminal {
		return terminal.Snapshot{}, fmt.Errorf("%w: %s", terminal.ErrWidgetNotFound, widgetID)
	}

	connection, err := r.connectionForWidget(widget.ConnectionID)
	if err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		return terminal.Snapshot{}, err
	}

	sessionID := ids.New("sess")
	startSession := false
	if _, stateErr := r.Terminals.GetState(widgetID); errors.Is(stateErr, terminal.ErrWidgetNotFound) {
		sessionID = widget.ID
		startSession = true
	}

	workingDir := r.RepoRoot
	if connection.Kind == "local" {
		if activeState, stateErr := r.Terminals.GetState(widgetID); stateErr == nil && strings.TrimSpace(activeState.WorkingDir) != "" {
			workingDir = activeState.WorkingDir
		}
	} else {
		workingDir = ""
	}

	launchOptions := terminal.LaunchOptions{
		WidgetID:   widget.ID,
		SessionID:  sessionID,
		WorkingDir: workingDir,
		Connection: connection,
	}
	var createErr error
	if startSession {
		_, createErr = r.Terminals.StartSession(ctx, launchOptions)
	} else {
		_, createErr = r.Terminals.CreateSession(ctx, launchOptions)
	}
	if createErr != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, createErr)
		return terminal.Snapshot{}, createErr
	}
	if err := r.observeConnectionLaunch(ctx, widget.ID, connection); err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
		_ = r.Terminals.CloseWidgetSession(widget.ID, sessionID)
		return terminal.Snapshot{}, err
	}
	_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, nil)
	r.clearRestoredTerminalState(widget.ID)
	return r.TerminalSnapshot(widget.ID, 0)
}

func (r *Runtime) FocusTerminalSession(widgetID string, sessionID string) (terminal.Snapshot, error) {
	if _, err := r.findWorkspaceWidget(widgetID); err != nil {
		return terminal.Snapshot{}, err
	}
	if _, err := r.Terminals.SetActiveSession(widgetID, sessionID); err != nil {
		return terminal.Snapshot{}, err
	}
	return r.TerminalSnapshot(widgetID, 0)
}

func (r *Runtime) CloseTerminalSession(widgetID string, sessionID string) (terminal.Snapshot, error) {
	if _, err := r.findWorkspaceWidget(widgetID); err != nil {
		return terminal.Snapshot{}, err
	}

	snapshot, err := r.TerminalSnapshot(widgetID, 0)
	if err != nil {
		return terminal.Snapshot{}, err
	}
	if len(snapshot.Sessions) <= 1 {
		return terminal.Snapshot{}, terminal.ErrCannotCloseLastSession
	}

	if err := r.Terminals.CloseWidgetSession(widgetID, sessionID); err != nil {
		return terminal.Snapshot{}, err
	}

	return r.TerminalSnapshot(widgetID, 0)
}

func (r *Runtime) findWorkspaceWidget(widgetID string) (workspace.Widget, error) {
	if r.Workspace == nil {
		return workspace.Widget{}, fmt.Errorf("%w: %s", terminal.ErrWidgetNotFound, widgetID)
	}
	for _, widget := range r.Workspace.Snapshot().Widgets {
		if widget.ID == widgetID {
			return widget, nil
		}
	}
	return workspace.Widget{}, fmt.Errorf("%w: %s", terminal.ErrWidgetNotFound, widgetID)
}
