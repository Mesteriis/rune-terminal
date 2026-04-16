package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func (r *Runtime) persistWorkspaceSnapshot(snapshot workspace.Snapshot) error {
	if strings.TrimSpace(r.Paths.WorkspaceFile) == "" {
		return nil
	}
	return workspace.SaveSnapshot(r.Paths.WorkspaceFile, snapshot)
}

func (r *Runtime) persistWorkspace() error {
	return r.persistWorkspaceSnapshot(r.Workspace.Snapshot())
}
