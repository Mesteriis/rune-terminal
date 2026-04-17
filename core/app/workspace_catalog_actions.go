package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

const compatWorkspaceWindowID = "browser-window"

func (r *Runtime) ListWorkspaces() []workspace.ListEntry {
	if r.WorkspaceCatalog == nil {
		return nil
	}
	return r.WorkspaceCatalog.ListEntries(compatWorkspaceWindowID)
}

func (r *Runtime) SwitchWorkspace(workspaceID string) (workspace.Snapshot, error) {
	if r.WorkspaceCatalog == nil {
		return workspace.Snapshot{}, workspace.ErrWorkspaceNotFound
	}
	snapshot, err := r.WorkspaceCatalog.SwitchActive(workspaceID)
	if err != nil {
		return workspace.Snapshot{}, err
	}
	r.Workspace.ReplaceSnapshot(snapshot)
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return workspace.Snapshot{}, err
	}
	r.ensureWorkspaceSessions(context.Background(), snapshot, true)
	return snapshot, nil
}

func (r *Runtime) CreateWorkspace(ctx context.Context) (workspace.Snapshot, error) {
	if r.WorkspaceCatalog == nil {
		return workspace.Snapshot{}, workspace.ErrWorkspaceNotFound
	}
	activeConnection, err := r.Connections.Active()
	if err != nil {
		return workspace.Snapshot{}, err
	}
	snapshot := newWorkspaceSnapshot(ids.New("ws"), ids.New("tab"), ids.New("term"), activeConnection.ID)
	r.WorkspaceCatalog.Upsert(snapshot)
	if _, err := r.WorkspaceCatalog.SwitchActive(snapshot.ID); err != nil {
		return workspace.Snapshot{}, err
	}
	r.Workspace.ReplaceSnapshot(snapshot)
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		return workspace.Snapshot{}, err
	}
	r.ensureWorkspaceSessions(ctx, snapshot, false)
	return snapshot, nil
}

func (r *Runtime) UpdateWorkspaceMetadata(
	workspaceID string,
	name string,
	icon string,
	color string,
	applyDefaults bool,
) (workspace.Snapshot, error) {
	if r.WorkspaceCatalog == nil {
		return workspace.Snapshot{}, workspace.ErrWorkspaceNotFound
	}
	snapshot, ok := r.WorkspaceCatalog.Get(workspaceID)
	if !ok {
		return workspace.Snapshot{}, fmt.Errorf("%w: %s", workspace.ErrWorkspaceNotFound, workspaceID)
	}

	if trimmed := strings.TrimSpace(name); trimmed != "" {
		snapshot.Name = trimmed
	} else if applyDefaults && strings.TrimSpace(snapshot.Name) == "" {
		snapshot.Name = fmt.Sprintf("New Workspace (%s)", snapshot.ID[:5])
	}
	if trimmed := strings.TrimSpace(icon); trimmed != "" {
		snapshot.Icon = trimmed
	} else if applyDefaults && strings.TrimSpace(snapshot.Icon) == "" {
		snapshot.Icon = workspace.WorkspaceIcons[0]
	}
	if trimmed := strings.TrimSpace(color); trimmed != "" {
		snapshot.Color = trimmed
	} else if applyDefaults && strings.TrimSpace(snapshot.Color) == "" {
		snapshot.Color = workspace.WorkspaceColors[r.savedWorkspaceCount()%len(workspace.WorkspaceColors)]
	}

	r.WorkspaceCatalog.Upsert(snapshot)
	if r.WorkspaceCatalog.ActiveSnapshot().ID == snapshot.ID {
		r.Workspace.ReplaceSnapshot(snapshot)
	}
	if err := r.persistWorkspaceSnapshot(r.WorkspaceCatalog.ActiveSnapshot()); err != nil {
		return workspace.Snapshot{}, err
	}
	return snapshot, nil
}

func (r *Runtime) DeleteWorkspace(workspaceID string) (workspace.Snapshot, error) {
	if r.WorkspaceCatalog == nil {
		return workspace.Snapshot{}, workspace.ErrWorkspaceNotFound
	}
	snapshot, ok := r.WorkspaceCatalog.Get(workspaceID)
	if !ok {
		return workspace.Snapshot{}, fmt.Errorf("%w: %s", workspace.ErrWorkspaceNotFound, workspaceID)
	}
	for _, widget := range snapshot.Widgets {
		if widget.Kind != workspace.WidgetKindTerminal {
			continue
		}
		_ = r.Terminals.CloseSession(widget.ID)
		r.clearRestoredTerminalState(widget.ID)
	}
	catalog, err := r.WorkspaceCatalog.Delete(workspaceID)
	if err != nil {
		return workspace.Snapshot{}, err
	}
	activeSnapshot, ok := activeSnapshotFromCatalog(catalog)
	if !ok {
		return workspace.Snapshot{}, fmt.Errorf("%w: no active workspace available", workspace.ErrWorkspaceNotFound)
	}
	r.Workspace.ReplaceSnapshot(activeSnapshot)
	if err := r.persistWorkspaceSnapshot(activeSnapshot); err != nil {
		return workspace.Snapshot{}, err
	}
	r.ensureWorkspaceSessions(context.Background(), activeSnapshot, true)
	return activeSnapshot, nil
}

func (r *Runtime) ensureWorkspaceSessions(ctx context.Context, snapshot workspace.Snapshot, restored bool) {
	for _, widget := range snapshot.Widgets {
		if widget.Kind != workspace.WidgetKindTerminal {
			continue
		}
		connection, err := r.connectionForWidget(widget.ConnectionID)
		if err != nil {
			_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
			r.setRestoredTerminalState(r.disconnectedState(widget, terminal.ConnectionSpec{}, err))
			continue
		}
		_, err = r.Terminals.StartSession(ctx, terminal.LaunchOptions{
			WidgetID:   widget.ID,
			WorkingDir: r.RepoRoot,
			Connection: connection,
			Restored:   restored,
		})
		if err != nil {
			_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
			r.setRestoredTerminalState(r.disconnectedState(widget, connection, err))
			continue
		}
		r.clearRestoredTerminalState(widget.ID)
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, nil)
	}
}

func (r *Runtime) savedWorkspaceCount() int {
	if r.WorkspaceCatalog == nil {
		return 0
	}
	return len(r.WorkspaceCatalog.ListEntries(""))
}

func newWorkspaceSnapshot(workspaceID string, tabID string, widgetID string, connectionID string) workspace.Snapshot {
	defaultLayout := workspace.DefaultLayout()
	return workspace.Snapshot{
		ID:    workspaceID,
		Name:  "",
		Icon:  "",
		Color: "",
		Tabs: []workspace.Tab{
			{
				ID:           tabID,
				Title:        "Main Shell",
				Description:  "Primary terminal tab",
				WidgetIDs:    []string{widgetID},
				WindowLayout: &workspace.WindowLayoutNode{Kind: workspace.WindowNodeLeaf, WidgetID: widgetID},
			},
		},
		ActiveTabID: tabID,
		Widgets: []workspace.Widget{
			{
				ID:           widgetID,
				Kind:         workspace.WidgetKindTerminal,
				Title:        "Main Shell",
				Description:  "Primary terminal session",
				TerminalID:   widgetID,
				ConnectionID: connectionID,
			},
		},
		ActiveWidgetID: widgetID,
		Layout:         defaultLayout,
		Layouts:        []workspace.Layout{defaultLayout},
		ActiveLayoutID: defaultLayout.ID,
	}
}

func activeSnapshotFromCatalog(catalog workspace.Catalog) (workspace.Snapshot, bool) {
	for _, snapshot := range catalog.Workspaces {
		if snapshot.ID == catalog.ActiveWorkspaceID {
			return snapshot, true
		}
	}
	return workspace.Snapshot{}, false
}
