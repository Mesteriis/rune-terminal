package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func (r *Runtime) persistWorkspaceSnapshot(snapshot workspace.Snapshot) error {
	if r.WorkspaceCatalog != nil {
		r.WorkspaceCatalog.SetActiveSnapshot(snapshot)
		if strings.TrimSpace(r.Paths.WorkspaceCatalogFile) != "" {
			if err := workspace.SaveCatalog(r.Paths.WorkspaceCatalogFile, r.WorkspaceCatalog.Snapshot()); err != nil {
				return err
			}
		}
	}
	if strings.TrimSpace(r.Paths.WorkspaceFile) == "" {
		return nil
	}
	return workspace.SaveSnapshot(r.Paths.WorkspaceFile, snapshot)
}

func (r *Runtime) persistWorkspace() error {
	return r.persistWorkspaceSnapshot(r.Workspace.Snapshot())
}

func (r *Runtime) snapshotWorkspaceMemory() (workspace.Snapshot, workspace.Catalog) {
	var snapshot workspace.Snapshot
	if r.Workspace != nil {
		snapshot = r.Workspace.Snapshot()
	}
	var catalog workspace.Catalog
	if r.WorkspaceCatalog != nil {
		catalog = r.WorkspaceCatalog.Snapshot()
	}
	return snapshot, catalog
}

func (r *Runtime) restoreWorkspaceMemory(snapshot workspace.Snapshot, catalog workspace.Catalog) {
	if r.Workspace != nil {
		r.Workspace.ReplaceSnapshot(snapshot)
	}
	if r.WorkspaceCatalog != nil {
		r.WorkspaceCatalog.Replace(catalog)
	}
}

func (r *Runtime) persistWorkspaceSnapshotWithRollback(
	snapshot workspace.Snapshot,
	previousSnapshot workspace.Snapshot,
	previousCatalog workspace.Catalog,
) error {
	if err := r.persistWorkspaceSnapshot(snapshot); err != nil {
		r.restoreWorkspaceMemory(previousSnapshot, previousCatalog)
		return err
	}
	return nil
}
