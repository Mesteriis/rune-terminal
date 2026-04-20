import { type SerializedDockview } from 'dockview-react'

import { type ShellWorkspaceTab } from '@/widgets'

export const DEFAULT_ACTIVE_WORKSPACE_ID = 2

/** Extends the topbar workspace tab model with a persisted Dockview snapshot payload. */
export type WorkspaceLayoutTab = ShellWorkspaceTab & {
  snapshot: SerializedDockview | null
}

/** Shape stored by the Dockview workspace client between shell launches. */
export type PersistedDockviewWorkspaceState = {
  activeWorkspaceId: number
  workspaceTabs: WorkspaceLayoutTab[]
}

/** Seeds the shell with two empty workspaces before any persisted state exists. */
export function createDefaultWorkspaceTabs(): WorkspaceLayoutTab[] {
  return [
    { id: 1, title: 'Workspace-1', snapshot: null },
    { id: 2, title: 'Workspace-2', snapshot: null },
  ]
}

/** Validates loosely parsed storage data before the shell trusts it as workspace state. */
export function normalizePersistedDockviewWorkspaceState(
  value: unknown,
): PersistedDockviewWorkspaceState | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const parsedValue = value as Partial<PersistedDockviewWorkspaceState>

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

  const hasActiveWorkspace = workspaceTabs.some((workspace) => workspace.id === parsedValue.activeWorkspaceId)

  if (!hasActiveWorkspace) {
    return null
  }

  return {
    activeWorkspaceId: parsedValue.activeWorkspaceId,
    workspaceTabs,
  }
}
