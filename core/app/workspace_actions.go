package app

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/avm/rterm/core/terminal"
	"github.com/avm/rterm/core/workspace"
	"github.com/avm/rterm/internal/ids"
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

type CloseTabResult struct {
	ClosedTabID string             `json:"closed_tab_id"`
	Workspace   workspace.Snapshot `json:"workspace"`
}

func (r *Runtime) FocusWidget(widgetID string) (workspace.Snapshot, error) {
	if _, err := r.Workspace.FocusWidget(widgetID); err != nil {
		return workspace.Snapshot{}, err
	}
	return r.Workspace.Snapshot(), nil
}

func (r *Runtime) FocusTab(tabID string) (workspace.Snapshot, error) {
	if _, err := r.Workspace.FocusTab(tabID); err != nil {
		return workspace.Snapshot{}, err
	}
	return r.Workspace.Snapshot(), nil
}

func (r *Runtime) RenameTab(tabID string, title string) (WorkspaceTabResult, error) {
	tab, err := r.Workspace.RenameTab(tabID, title)
	if err != nil {
		return WorkspaceTabResult{}, err
	}
	return WorkspaceTabResult{Tab: tab, Workspace: r.Workspace.Snapshot()}, nil
}

func (r *Runtime) SetTabPinned(tabID string, pinned bool) (WorkspaceTabResult, error) {
	tab, err := r.Workspace.SetTabPinned(tabID, pinned)
	if err != nil {
		return WorkspaceTabResult{}, err
	}
	return WorkspaceTabResult{Tab: tab, Workspace: r.Workspace.Snapshot()}, nil
}

func (r *Runtime) MoveTab(tabID string, beforeTabID string) (workspace.Snapshot, error) {
	return r.Workspace.MoveTab(tabID, beforeTabID)
}

func (r *Runtime) CreateTerminalTab(ctx context.Context, title string) (CreateTerminalTabResult, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "New Shell"
	}
	widgetID := ids.New("term")
	tabID := ids.New("tab")
	if _, err := r.Terminals.StartSession(ctx, terminal.LaunchOptions{
		WidgetID:   widgetID,
		WorkingDir: r.RepoRoot,
	}); err != nil {
		return CreateTerminalTabResult{}, err
	}
	snapshot := r.Workspace.AddTerminalTab(
		workspace.Tab{
			ID:          tabID,
			Title:       title,
			Description: "Terminal tab",
			WidgetIDs:   []string{widgetID},
		},
		workspace.Widget{
			ID:          widgetID,
			Kind:        workspace.WidgetKindTerminal,
			Title:       title,
			Description: fmt.Sprintf("%s terminal session", title),
			TerminalID:  widgetID,
		},
	)
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
	return CloseTabResult{
		ClosedTabID: tabID,
		Workspace:   nextSnapshot,
	}, nil
}
