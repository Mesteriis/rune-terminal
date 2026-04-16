package app

import (
	"errors"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func (r *Runtime) TerminalSnapshot(widgetID string, from uint64) (terminal.Snapshot, error) {
	snapshot, err := r.Terminals.Snapshot(widgetID, from)
	if err == nil {
		return snapshot, nil
	}
	if !errors.Is(err, terminal.ErrWidgetNotFound) {
		return terminal.Snapshot{}, err
	}
	if state, ok := r.getRestoredTerminalState(widgetID); ok {
		return terminal.Snapshot{
			State:   state,
			Chunks:  []terminal.OutputChunk{},
			NextSeq: 1,
		}, nil
	}

	widget, lookupErr := r.findWorkspaceWidget(widgetID)
	if lookupErr != nil {
		return terminal.Snapshot{}, err
	}
	return terminal.Snapshot{
		State:   r.disconnectedState(widget, terminal.ConnectionSpec{}, nil),
		Chunks:  []terminal.OutputChunk{},
		NextSeq: 1,
	}, nil
}

func (r *Runtime) disconnectedState(widget workspace.Widget, connection terminal.ConnectionSpec, launchErr error) terminal.State {
	kind := strings.TrimSpace(connection.Kind)
	if kind == "" {
		if widget.ConnectionID == "" || widget.ConnectionID == "local" || strings.HasPrefix(widget.ConnectionID, "local:") {
			kind = "local"
		} else {
			kind = "ssh"
		}
	}
	connectionID := strings.TrimSpace(connection.ID)
	if connectionID == "" {
		connectionID = strings.TrimSpace(widget.ConnectionID)
	}
	if connectionID == "" && kind == "local" {
		connectionID = "local"
	}
	connectionName := strings.TrimSpace(connection.Name)
	if connectionName == "" && kind == "local" {
		connectionName = "Local Machine"
	}
	if connectionName == "" {
		connectionName = connectionID
	}
	shell := terminal.DefaultShell()
	if kind == "ssh" {
		shell = "ssh"
	}
	return terminal.State{
		WidgetID:       widget.ID,
		SessionID:      widget.ID,
		Shell:          shell,
		Restored:       true,
		Status:         terminal.StatusDisconnected,
		StatusDetail:   disconnectedStatusDetail(launchErr),
		ConnectionID:   connectionID,
		ConnectionName: connectionName,
		ConnectionKind: kind,
		PID:            0,
		StartedAt:      time.Now().UTC(),
		CanSendInput:   false,
		CanInterrupt:   false,
	}
}

func disconnectedStatusDetail(err error) string {
	if err == nil {
		return "session is not running; restart explicitly to create a new process"
	}
	message := strings.TrimSpace(err.Error())
	if message == "" {
		return "session is not running; restart explicitly to create a new process"
	}
	return message
}

func (r *Runtime) setRestoredTerminalState(state terminal.State) {
	r.restoredMu.Lock()
	defer r.restoredMu.Unlock()
	r.restored[state.WidgetID] = state
}

func (r *Runtime) clearRestoredTerminalState(widgetID string) {
	r.restoredMu.Lock()
	defer r.restoredMu.Unlock()
	delete(r.restored, widgetID)
}

func (r *Runtime) getRestoredTerminalState(widgetID string) (terminal.State, bool) {
	r.restoredMu.RLock()
	defer r.restoredMu.RUnlock()
	state, ok := r.restored[widgetID]
	return state, ok
}
