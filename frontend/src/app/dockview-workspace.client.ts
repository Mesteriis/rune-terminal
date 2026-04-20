import {
  normalizePersistedDockviewWorkspaceState,
  type PersistedDockviewWorkspaceState,
} from './dockview-workspace.persistence'

const DEFAULT_DOCKVIEW_WORKSPACE_STORAGE_KEY = 'runa-terminal:dockview-workspaces:v1'

export type DockviewWorkspaceClient = {
  readState: () => PersistedDockviewWorkspaceState | null
  writeState: (state: PersistedDockviewWorkspaceState) => void
}

type CreateLocalDockviewWorkspaceClientOptions = {
  storage?: Storage | null
  storageKey?: string
}

function resolveBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

export function createLocalDockviewWorkspaceClient({
  storage = resolveBrowserStorage(),
  storageKey = DEFAULT_DOCKVIEW_WORKSPACE_STORAGE_KEY,
}: CreateLocalDockviewWorkspaceClientOptions = {}): DockviewWorkspaceClient {
  return {
    readState() {
      if (!storage) {
        return null
      }

      try {
        const rawValue = storage.getItem(storageKey)

        if (!rawValue) {
          return null
        }

        return normalizePersistedDockviewWorkspaceState(JSON.parse(rawValue))
      } catch {
        return null
      }
    },
    writeState(state) {
      if (!storage) {
        return
      }

      storage.setItem(storageKey, JSON.stringify(state))
    },
  }
}

export const dockviewWorkspaceClient = createLocalDockviewWorkspaceClient()
