import { type DockviewApi, type SerializedDockview } from 'dockview-react'

import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'

export function captureDockviewWorkspaceSnapshot(api: DockviewApi): SerializedDockview | null {
  return api.panels.length > 0 ? api.toJSON() : null
}

export function applyDockviewWorkspaceSnapshot(api: DockviewApi, snapshot: SerializedDockview | null) {
  if (!snapshot) {
    api.clear()
    return
  }

  api.fromJSON(snapshot)
}

export function readDockviewWorkspaceSnapshot(workspaceTabs: WorkspaceLayoutTab[], workspaceId: number) {
  return workspaceTabs.find((workspace) => workspace.id === workspaceId)?.snapshot ?? null
}

export function writeDockviewWorkspaceSnapshot(
  workspaceTabs: WorkspaceLayoutTab[],
  workspaceId: number,
  snapshot: SerializedDockview | null,
) {
  return workspaceTabs.map((workspace) =>
    workspace.id === workspaceId ? { ...workspace, snapshot } : workspace,
  )
}

export function createDockviewWorkspaceTab(workspaceTabs: WorkspaceLayoutTab[]): WorkspaceLayoutTab {
  const nextWorkspaceId = workspaceTabs.length + 1

  return {
    id: nextWorkspaceId,
    title: `Workspace-${nextWorkspaceId}`,
    snapshot: null,
  }
}
