import { type DockviewApi, type SerializedDockview } from 'dockview-react'

import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'

/** Captures the current Dockview layout only when the workspace actually has panels. */
export function captureDockviewWorkspaceSnapshot(api: DockviewApi): SerializedDockview | null {
  return api.panels.length > 0 ? api.toJSON() : null
}

/** Applies a persisted snapshot or clears Dockview when the workspace is intentionally empty. */
export function applyDockviewWorkspaceSnapshot(api: DockviewApi, snapshot: SerializedDockview | null) {
  if (!snapshot) {
    api.clear()
    return
  }

  api.fromJSON(snapshot)
}

/** Reads the snapshot assigned to one workspace tab. */
export function readDockviewWorkspaceSnapshot(workspaceTabs: WorkspaceLayoutTab[], workspaceId: number) {
  return workspaceTabs.find((workspace) => workspace.id === workspaceId)?.snapshot ?? null
}

/** Replaces the snapshot payload for one workspace tab without mutating the rest. */
export function writeDockviewWorkspaceSnapshot(
  workspaceTabs: WorkspaceLayoutTab[],
  workspaceId: number,
  snapshot: SerializedDockview | null,
) {
  return workspaceTabs.map((workspace) =>
    workspace.id === workspaceId ? { ...workspace, snapshot } : workspace,
  )
}

/** Creates the next sequential workspace tab entry for the shell topbar. */
export function createDockviewWorkspaceTab(workspaceTabs: WorkspaceLayoutTab[]): WorkspaceLayoutTab {
  const nextWorkspaceId =
    workspaceTabs.reduce((maxWorkspaceId, workspace) => Math.max(maxWorkspaceId, workspace.id), 0) + 1

  return {
    id: nextWorkspaceId,
    title: `Workspace-${nextWorkspaceId}`,
    snapshot: null,
  }
}
