import { type DockviewApi, type SerializedDockview } from 'dockview-react'

import { type WorkspaceWidgetKindCatalogEntry } from '@/shared/api/workspace'
import { hasDockviewWorkspaceBootstrap, seedDockviewWorkspaceBootstrap } from './dockview-workspace.bootstrap'
import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'

/** Describes how the shell initialized Dockview for the current ready event. */
export type DockviewWorkspaceReadyResult =
  | { type: 'layout-only' }
  | { type: 'restored-snapshot' }
  | { type: 'cleared-persisted-empty' }
  | { type: 'seeded-default'; snapshot: SerializedDockview }

type ResolveDockviewWorkspaceReadyOptions = {
  activeWorkspaceId: number
  api: DockviewApi
  hasPersistedWorkspaceState: boolean
  widgetCatalogEntries?: WorkspaceWidgetKindCatalogEntry[]
  workspaceTabs: WorkspaceLayoutTab[]
}

/** Chooses whether Dockview should restore, clear, or seed layout state on startup. */
export function resolveDockviewWorkspaceReadyState({
  activeWorkspaceId,
  api,
  hasPersistedWorkspaceState,
  widgetCatalogEntries,
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
    snapshot: seedDockviewWorkspaceBootstrap(api, widgetCatalogEntries),
  }
}
