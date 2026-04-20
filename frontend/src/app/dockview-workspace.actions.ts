import { createDockviewWorkspaceTab } from './dockview-workspace.snapshots'
import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'

type SelectDockviewWorkspaceOptions = {
  currentActiveWorkspaceId: number
  nextWorkspaceId: number
  persistCurrentWorkspaceSnapshot: () => void
  restoreWorkspaceSnapshot: (workspaceId: number) => void
  setActiveWorkspaceId: (workspaceId: number) => void
}

/** Persists the current layout before switching to another workspace snapshot. */
export function selectDockviewWorkspace({
  currentActiveWorkspaceId,
  nextWorkspaceId,
  persistCurrentWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  setActiveWorkspaceId,
}: SelectDockviewWorkspaceOptions) {
  if (nextWorkspaceId === currentActiveWorkspaceId) {
    return false
  }

  persistCurrentWorkspaceSnapshot()
  setActiveWorkspaceId(nextWorkspaceId)
  restoreWorkspaceSnapshot(nextWorkspaceId)

  return true
}

type AddDockviewWorkspaceOptions = {
  persistCurrentWorkspaceSnapshot: () => void
  restoreWorkspaceSnapshot: (workspaceId: number) => void
  setActiveWorkspaceId: (workspaceId: number) => void
  updateWorkspaceTabs: (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => void
  workspaceTabs: WorkspaceLayoutTab[]
}

/** Appends a new workspace tab and immediately activates its empty snapshot. */
export function addDockviewWorkspace({
  persistCurrentWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  setActiveWorkspaceId,
  updateWorkspaceTabs,
  workspaceTabs,
}: AddDockviewWorkspaceOptions) {
  persistCurrentWorkspaceSnapshot()

  const nextWorkspace = createDockviewWorkspaceTab(workspaceTabs)

  updateWorkspaceTabs((tabs) => [...tabs, nextWorkspace])
  setActiveWorkspaceId(nextWorkspace.id)
  restoreWorkspaceSnapshot(nextWorkspace.id)

  return nextWorkspace
}
