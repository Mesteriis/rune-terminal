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

type RenameDockviewWorkspaceOptions = {
  nextTitle: string
  updateWorkspaceTabs: (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => void
  workspaceId: number
}

/** Renames a workspace tab without letting blank titles replace the current label. */
export function renameDockviewWorkspace({
  nextTitle,
  updateWorkspaceTabs,
  workspaceId,
}: RenameDockviewWorkspaceOptions) {
  const trimmedTitle = nextTitle.trim()

  if (!trimmedTitle) {
    return false
  }

  updateWorkspaceTabs((tabs) =>
    tabs.map((workspace) =>
      workspace.id === workspaceId ? { ...workspace, title: trimmedTitle } : workspace,
    ),
  )

  return true
}

type DeleteDockviewWorkspaceOptions = {
  activeWorkspaceId: number
  persistCurrentWorkspaceSnapshot: () => void
  restoreWorkspaceSnapshot: (workspaceId: number) => void
  setActiveWorkspaceId: (workspaceId: number) => void
  updateWorkspaceTabs: (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => void
  workspaceId: number
  workspaceTabs: WorkspaceLayoutTab[]
}

function resolveWorkspaceAfterDelete(workspaceTabs: WorkspaceLayoutTab[], workspaceId: number) {
  const deletedWorkspaceIndex = workspaceTabs.findIndex((workspace) => workspace.id === workspaceId)

  if (deletedWorkspaceIndex < 0) {
    return null
  }

  return workspaceTabs[deletedWorkspaceIndex - 1] ?? workspaceTabs[deletedWorkspaceIndex + 1] ?? null
}

/** Removes a workspace tab while keeping at least one restorable workspace alive. */
export function deleteDockviewWorkspace({
  activeWorkspaceId,
  persistCurrentWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  setActiveWorkspaceId,
  updateWorkspaceTabs,
  workspaceId,
  workspaceTabs,
}: DeleteDockviewWorkspaceOptions) {
  if (workspaceTabs.length <= 1 || !workspaceTabs.some((workspace) => workspace.id === workspaceId)) {
    return false
  }

  const nextActiveWorkspace =
    workspaceId === activeWorkspaceId ? resolveWorkspaceAfterDelete(workspaceTabs, workspaceId) : null

  persistCurrentWorkspaceSnapshot()
  updateWorkspaceTabs((tabs) => tabs.filter((workspace) => workspace.id !== workspaceId))

  if (nextActiveWorkspace) {
    setActiveWorkspaceId(nextActiveWorkspace.id)
    restoreWorkspaceSnapshot(nextActiveWorkspace.id)
  }

  return true
}
