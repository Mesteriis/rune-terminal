package app

import (
	"math"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type TerminalSessionCatalogResult struct {
	ActiveWorkspaceID string                      `json:"active_workspace_id,omitempty"`
	Sessions          []TerminalSessionCatalogRow `json:"sessions"`
}

type TerminalSessionCatalogRow struct {
	WorkspaceID       string          `json:"workspace_id"`
	WorkspaceName     string          `json:"workspace_name"`
	TabID             string          `json:"tab_id,omitempty"`
	TabTitle          string          `json:"tab_title,omitempty"`
	WidgetID          string          `json:"widget_id"`
	WidgetTitle       string          `json:"widget_title"`
	SessionID         string          `json:"session_id"`
	ConnectionID      string          `json:"connection_id,omitempty"`
	ConnectionKind    string          `json:"connection_kind,omitempty"`
	ConnectionName    string          `json:"connection_name,omitempty"`
	RemoteLaunchMode  string          `json:"remote_launch_mode,omitempty"`
	RemoteSessionName string          `json:"remote_session_name,omitempty"`
	Shell             string          `json:"shell"`
	Status            terminal.Status `json:"status"`
	StatusDetail      string          `json:"status_detail,omitempty"`
	WorkingDir        string          `json:"working_dir,omitempty"`
	IsActiveWorkspace bool            `json:"is_active_workspace"`
	IsActiveTab       bool            `json:"is_active_tab"`
	IsActiveWidget    bool            `json:"is_active_widget"`
	IsActiveSession   bool            `json:"is_active_session"`
}

func (r *Runtime) TerminalSessionCatalog() TerminalSessionCatalogResult {
	if r.WorkspaceCatalog == nil {
		return TerminalSessionCatalogResult{Sessions: []TerminalSessionCatalogRow{}}
	}

	catalog := r.WorkspaceCatalog.Snapshot()
	rows := make([]TerminalSessionCatalogRow, 0)

	for _, workspaceSnapshot := range catalog.Workspaces {
		tabByWidgetID := make(map[string]workspace.Tab, len(workspaceSnapshot.Widgets))
		for _, tab := range workspaceSnapshot.Tabs {
			for _, widgetID := range tab.WidgetIDs {
				tabByWidgetID[widgetID] = tab
			}
		}

		for _, widget := range workspaceSnapshot.Widgets {
			if widget.Kind != workspace.WidgetKindTerminal {
				continue
			}

			snapshot, err := r.TerminalSnapshot(widget.ID, math.MaxUint64)
			if err != nil {
				continue
			}

			activeSessionID := strings.TrimSpace(snapshot.ActiveSessionID)
			if activeSessionID == "" {
				activeSessionID = strings.TrimSpace(snapshot.State.SessionID)
			}

			sessions := snapshot.Sessions
			if len(sessions) == 0 {
				sessions = []terminal.State{snapshot.State}
			}

			tab := tabByWidgetID[widget.ID]
			workspaceName := strings.TrimSpace(workspaceSnapshot.Name)
			if workspaceName == "" {
				workspaceName = "Workspace"
			}
			widgetTitle := strings.TrimSpace(widget.Title)
			if widgetTitle == "" {
				widgetTitle = "Terminal"
			}

			for _, sessionState := range sessions {
				rows = append(rows, TerminalSessionCatalogRow{
					WorkspaceID:       workspaceSnapshot.ID,
					WorkspaceName:     workspaceName,
					TabID:             strings.TrimSpace(tab.ID),
					TabTitle:          strings.TrimSpace(tab.Title),
					WidgetID:          widget.ID,
					WidgetTitle:       widgetTitle,
					SessionID:         sessionState.SessionID,
					ConnectionID:      strings.TrimSpace(sessionState.ConnectionID),
					ConnectionKind:    strings.TrimSpace(sessionState.ConnectionKind),
					ConnectionName:    strings.TrimSpace(sessionState.ConnectionName),
					RemoteLaunchMode:  strings.TrimSpace(sessionState.RemoteLaunchMode),
					RemoteSessionName: strings.TrimSpace(sessionState.RemoteSessionName),
					Shell:             strings.TrimSpace(sessionState.Shell),
					Status:            sessionState.Status,
					StatusDetail:      strings.TrimSpace(sessionState.StatusDetail),
					WorkingDir:        strings.TrimSpace(sessionState.WorkingDir),
					IsActiveWorkspace: workspaceSnapshot.ID == catalog.ActiveWorkspaceID,
					IsActiveTab:       tab.ID != "" && tab.ID == workspaceSnapshot.ActiveTabID,
					IsActiveWidget:    widget.ID == workspaceSnapshot.ActiveWidgetID,
					IsActiveSession:   sessionState.SessionID == activeSessionID,
				})
			}
		}
	}

	return TerminalSessionCatalogResult{
		ActiveWorkspaceID: catalog.ActiveWorkspaceID,
		Sessions:          rows,
	}
}
