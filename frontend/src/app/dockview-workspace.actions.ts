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
  title: string
  updateWorkspaceTabs: (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => void
  workspaceId: number
}

/** Replaces one workspace title after trimming and validating the requested label. */
export function renameDockviewWorkspace({
  title,
  updateWorkspaceTabs,
  workspaceId,
}: RenameDockviewWorkspaceOptions) {
  const nextTitle = title.trim()

  if (!nextTitle) {
    return false
  }

  let renamed = false

  updateWorkspaceTabs((tabs) =>
    tabs.map((workspace) => {
      if (workspace.id !== workspaceId || workspace.title === nextTitle) {
        return workspace
      }

      renamed = true
      return { ...workspace, title: nextTitle }
    }),
  )

  return renamed
}

type DeleteDockviewWorkspaceOptions = {
  activeWorkspaceId: number
  restoreWorkspaceSnapshot: (workspaceId: number) => void
  setActiveWorkspaceId: (workspaceId: number) => void
  updateWorkspaceTabs: (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => void
  workspaceId: number
  workspaceTabs: WorkspaceLayoutTab[]
}

/** Removes one workspace tab and restores an adjacent snapshot if the active workspace was deleted. */
export function deleteDockviewWorkspace({
  activeWorkspaceId,
  restoreWorkspaceSnapshot,
  setActiveWorkspaceId,
  updateWorkspaceTabs,
  workspaceId,
  workspaceTabs,
}: DeleteDockviewWorkspaceOptions) {
  if (workspaceTabs.length <= 1) {
    return false
  }

  const workspaceIndex = workspaceTabs.findIndex((workspace) => workspace.id === workspaceId)

  if (workspaceIndex < 0) {
    return false
  }

  const nextTabs = workspaceTabs.filter((workspace) => workspace.id !== workspaceId)

  updateWorkspaceTabs(() => nextTabs)

  if (activeWorkspaceId !== workspaceId) {
    return true
  }

  const fallbackWorkspace = nextTabs[workspaceIndex] ?? nextTabs[workspaceIndex - 1] ?? nextTabs[0]

  if (!fallbackWorkspace) {
    return false
  }

  setActiveWorkspaceId(fallbackWorkspace.id)
  restoreWorkspaceSnapshot(fallbackWorkspace.id)

  return true
}
