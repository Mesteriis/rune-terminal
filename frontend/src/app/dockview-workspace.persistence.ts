import { type SerializedDockview } from 'dockview-react'

import { type ShellWorkspaceTab } from '@/widgets'

const DOCKVIEW_WORKSPACE_STORAGE_KEY = 'runa-terminal:dockview-workspaces:v1'

export const DEFAULT_ACTIVE_WORKSPACE_ID = 2

export type WorkspaceLayoutTab = ShellWorkspaceTab & {
  snapshot: SerializedDockview | null
}

export type PersistedDockviewWorkspaceState = {
  activeWorkspaceId: number
  workspaceTabs: WorkspaceLayoutTab[]
}

export function createDefaultWorkspaceTabs(): WorkspaceLayoutTab[] {
  return [
    { id: 1, title: 'Workspace-1', snapshot: null },
    { id: 2, title: 'Workspace-2', snapshot: null },
  ]
}

export function readPersistedDockviewWorkspaceState(): PersistedDockviewWorkspaceState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(DOCKVIEW_WORKSPACE_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedDockviewWorkspaceState>

    if (!Array.isArray(parsedValue.workspaceTabs) || typeof parsedValue.activeWorkspaceId !== 'number') {
      return null
    }

    const workspaceTabs = parsedValue.workspaceTabs
      .filter((workspace): workspace is WorkspaceLayoutTab =>
        Boolean(
          workspace &&
          typeof workspace.id === 'number' &&
          typeof workspace.title === 'string' &&
          'snapshot' in workspace,
        ),
      )
      .map((workspace) => ({
        id: workspace.id,
        title: workspace.title,
        snapshot: workspace.snapshot ?? null,
      }))

    if (workspaceTabs.length === 0) {
      return null
    }

    const hasActiveWorkspace = workspaceTabs.some(
      (workspace) => workspace.id === parsedValue.activeWorkspaceId,
    )

    if (!hasActiveWorkspace) {
      return null
    }

    return {
      activeWorkspaceId: parsedValue.activeWorkspaceId,
      workspaceTabs,
    }
  } catch {
    return null
  }
}

export function writePersistedDockviewWorkspaceState(state: PersistedDockviewWorkspaceState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DOCKVIEW_WORKSPACE_STORAGE_KEY, JSON.stringify(state))
}
