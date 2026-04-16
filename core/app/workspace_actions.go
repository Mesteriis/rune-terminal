package app

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type WorkspaceTabResult struct {
	Tab       workspace.Tab      `json:"tab,omitempty"`
	Workspace workspace.Snapshot `json:"workspace"`
}

type CreateTerminalTabResult struct {
	TabID     string             `json:"tab_id"`
	WidgetID  string             `json:"widget_id"`
	Workspace workspace.Snapshot `json:"workspace"`
}

type CreateRemoteSessionResult struct {
	TabID        string             `json:"tab_id"`
	WidgetID     string             `json:"widget_id"`
	SessionID    string             `json:"session_id"`
	ProfileID    string             `json:"profile_id"`
	ConnectionID string             `json:"connection_id"`
	Reused       bool               `json:"reused"`
	Workspace    workspace.Snapshot `json:"workspace"`
}

type remoteSessionIdentity struct {
	TabID     string
	WidgetID  string
	SessionID string
}

type CloseTabResult struct {
	ClosedTabID string             `json:"closed_tab_id"`
	Workspace   workspace.Snapshot `json:"workspace"`
}

func (r *Runtime) FocusWidget(widgetID string) (workspace.Snapshot, error) {
	if _, err := r.Workspace.FocusWidget(widgetID); err != nil {
		return workspace.Snapshot{}, err
	}
	snapshot := r.Workspace.Snapshot()
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return workspace.Snapshot{}, err
	}
	return snapshot, nil
}

func (r *Runtime) FocusTab(tabID string) (workspace.Snapshot, error) {
	if _, err := r.Workspace.FocusTab(tabID); err != nil {
		return workspace.Snapshot{}, err
	}
	snapshot := r.Workspace.Snapshot()
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return workspace.Snapshot{}, err
	}
	return snapshot, nil
}

func (r *Runtime) RenameTab(tabID string, title string) (WorkspaceTabResult, error) {
	tab, err := r.Workspace.RenameTab(tabID, title)
	if err != nil {
		return WorkspaceTabResult{}, err
	}
	snapshot := r.Workspace.Snapshot()
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return WorkspaceTabResult{}, err
	}
	return WorkspaceTabResult{Tab: tab, Workspace: snapshot}, nil
}

func (r *Runtime) SetTabPinned(tabID string, pinned bool) (WorkspaceTabResult, error) {
	tab, err := r.Workspace.SetTabPinned(tabID, pinned)
	if err != nil {
		return WorkspaceTabResult{}, err
	}
	snapshot := r.Workspace.Snapshot()
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return WorkspaceTabResult{}, err
	}
	return WorkspaceTabResult{Tab: tab, Workspace: snapshot}, nil
}

func (r *Runtime) MoveTab(tabID string, beforeTabID string) (workspace.Snapshot, error) {
	snapshot, err := r.Workspace.MoveTab(tabID, beforeTabID)
	if err != nil {
		return workspace.Snapshot{}, err
	}
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return workspace.Snapshot{}, err
	}
	return snapshot, nil
}

func (r *Runtime) CreateTerminalTab(ctx context.Context, title string) (CreateTerminalTabResult, error) {
	return r.CreateTerminalTabWithConnection(ctx, title, "")
}

func (r *Runtime) CreateRemoteTerminalTab(ctx context.Context, title string, connectionID string) (CreateTerminalTabResult, error) {
	if connectionID == "" {
		activeConnection, err := r.Connections.Active()
		if err != nil {
			return CreateTerminalTabResult{}, err
		}
		connectionID = activeConnection.ID
	}
	connection, err := r.Connections.Resolve(connectionID)
	if err != nil {
		return CreateTerminalTabResult{}, err
	}
	if connection.Kind != connections.KindSSH {
		return CreateTerminalTabResult{}, fmt.Errorf("%w: remote terminal requires an ssh connection target", connections.ErrInvalidConnection)
	}
	return r.CreateTerminalTabWithConnection(ctx, title, connectionID)
}

func (r *Runtime) CreateRemoteTerminalTabFromProfile(ctx context.Context, title string, profileID string) (CreateRemoteSessionResult, error) {
	profileID = strings.TrimSpace(profileID)
	if profileID == "" {
		return CreateRemoteSessionResult{}, fmt.Errorf("%w: remote profile id is required", connections.ErrInvalidConnection)
	}
	if identity, ok := r.findReusableRemoteSession(profileID); ok {
		if _, err := r.FocusWidget(identity.WidgetID); err != nil {
			return CreateRemoteSessionResult{}, err
		}
		return CreateRemoteSessionResult{
			TabID:        identity.TabID,
			WidgetID:     identity.WidgetID,
			SessionID:    identity.SessionID,
			ProfileID:    profileID,
			ConnectionID: profileID,
			Reused:       true,
			Workspace:    r.Workspace.Snapshot(),
		}, nil
	}
	created, err := r.CreateRemoteTerminalTab(ctx, title, profileID)
	if err != nil {
		return CreateRemoteSessionResult{}, err
	}
	return CreateRemoteSessionResult{
		TabID:        created.TabID,
		WidgetID:     created.WidgetID,
		SessionID:    created.WidgetID,
		ProfileID:    profileID,
		ConnectionID: profileID,
		Reused:       false,
		Workspace:    created.Workspace,
	}, nil
}

func (r *Runtime) findReusableRemoteSession(profileID string) (remoteSessionIdentity, bool) {
	snapshot := r.Workspace.Snapshot()
	widgetTabIndex := make(map[string]string, len(snapshot.Widgets))
	for _, tab := range snapshot.Tabs {
		for _, widgetID := range tab.WidgetIDs {
			widgetTabIndex[widgetID] = tab.ID
		}
	}
	for _, widget := range snapshot.Widgets {
		if widget.Kind != workspace.WidgetKindTerminal || widget.ConnectionID != profileID {
			continue
		}
		state, err := r.Terminals.GetState(widget.ID)
		if err != nil {
			continue
		}
		if state.ConnectionKind != string(connections.KindSSH) || state.Status != terminal.StatusRunning {
			continue
		}
		tabID := widgetTabIndex[widget.ID]
		if tabID == "" {
			continue
		}
		return remoteSessionIdentity{
			TabID:     tabID,
			WidgetID:  widget.ID,
			SessionID: state.SessionID,
		}, true
	}
	return remoteSessionIdentity{}, false
}

func (r *Runtime) CreateTerminalTabWithConnection(ctx context.Context, title string, connectionID string) (CreateTerminalTabResult, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "New Shell"
	}
	widgetID := ids.New("term")
	tabID := ids.New("tab")
	if connectionID == "" {
		activeConnection, err := r.Connections.Active()
		if err != nil {
			return CreateTerminalTabResult{}, err
		}
		connectionID = activeConnection.ID
	}
	connection, err := r.connectionForWidget(connectionID)
	if err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(connectionID, err)
		return CreateTerminalTabResult{}, err
	}
	if _, err := r.Terminals.StartSession(ctx, terminal.LaunchOptions{
		WidgetID:   widgetID,
		WorkingDir: r.RepoRoot,
		Connection: connection,
	}); err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(connectionID, err)
		return CreateTerminalTabResult{}, err
	}
	if err := r.observeConnectionLaunch(ctx, widgetID, connection); err != nil {
		_, _, _ = r.Connections.ReportLaunchResult(connectionID, err)
		_ = r.Terminals.CloseSession(widgetID)
		return CreateTerminalTabResult{}, err
	}
	_, _, _ = r.Connections.ReportLaunchResult(connectionID, nil)
	snapshot := r.Workspace.AddTerminalTab(
		workspace.Tab{
			ID:          tabID,
			Title:       title,
			Description: "Terminal tab",
			WidgetIDs:   []string{widgetID},
		},
		workspace.Widget{
			ID:           widgetID,
			Kind:         workspace.WidgetKindTerminal,
			Title:        title,
			Description:  fmt.Sprintf("%s terminal session", title),
			TerminalID:   widgetID,
			ConnectionID: connectionID,
		},
	)
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		_ = r.Terminals.CloseSession(widgetID)
		_, _ = r.Workspace.CloseTab(tabID)
		return CreateTerminalTabResult{}, err
	}
	return CreateTerminalTabResult{
		TabID:     tabID,
		WidgetID:  widgetID,
		Workspace: snapshot,
	}, nil
}

func (r *Runtime) CloseTab(tabID string) (CloseTabResult, error) {
	snapshot := r.Workspace.Snapshot()
	if len(snapshot.Tabs) <= 1 {
		return CloseTabResult{}, workspace.ErrCannotCloseLastTab
	}
	var tab workspace.Tab
	found := false
	for _, candidate := range snapshot.Tabs {
		if candidate.ID == tabID {
			tab = candidate
			found = true
			break
		}
	}
	if !found {
		return CloseTabResult{}, fmt.Errorf("%w: %s", workspace.ErrTabNotFound, tabID)
	}
	for _, widgetID := range tab.WidgetIDs {
		if err := r.Terminals.CloseSession(widgetID); err != nil && !errors.Is(err, terminal.ErrWidgetNotFound) {
			return CloseTabResult{}, err
		}
	}
	nextSnapshot, err := r.Workspace.CloseTab(tabID)
	if err != nil {
		return CloseTabResult{}, err
	}
	if err := r.persistWorkspaceSnapshot(nextSnapshot); err != nil {
		return CloseTabResult{}, err
	}
	return CloseTabResult{
		ClosedTabID: tabID,
		Workspace:   nextSnapshot,
	}, nil
}
