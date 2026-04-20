import { type DockviewApi, type SerializedDockview } from 'dockview-react'

import { hasDockviewWorkspaceBootstrap, seedDockviewWorkspaceBootstrap } from './dockview-workspace.bootstrap'
import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'

export type DockviewWorkspaceReadyResult =
  | { type: 'layout-only' }
  | { type: 'restored-snapshot' }
  | { type: 'cleared-persisted-empty' }
  | { type: 'seeded-default'; snapshot: SerializedDockview }

type ResolveDockviewWorkspaceReadyOptions = {
  activeWorkspaceId: number
  api: DockviewApi
  hasPersistedWorkspaceState: boolean
  workspaceTabs: WorkspaceLayoutTab[]
}

export function resolveDockviewWorkspaceReadyState({
  activeWorkspaceId,
  api,
  hasPersistedWorkspaceState,
  workspaceTabs,
}: ResolveDockviewWorkspaceReadyOptions): DockviewWorkspaceReadyResult {
  if (hasDockviewWorkspaceBootstrap(api)) {
    return { type: 'layout-only' }
  }

  const activeWorkspace = workspaceTabs.find((workspace) => workspace.id === activeWorkspaceId)

  if (activeWorkspace?.snapshot) {
    api.fromJSON(activeWorkspace.snapshot)
    return { type: 'restored-snapshot' }
  }

  if (hasPersistedWorkspaceState) {
    api.clear()
    return { type: 'cleared-persisted-empty' }
  }

  return {
    type: 'seeded-default',
    snapshot: seedDockviewWorkspaceBootstrap(api),
  }
}
