import {
  normalizePersistedDockviewWorkspaceState,
  type PersistedDockviewWorkspaceState,
} from './dockview-workspace.persistence'

const DEFAULT_DOCKVIEW_WORKSPACE_STORAGE_KEY = 'runa-terminal:dockview-workspaces:v1'

/** Defines the persistence boundary for Dockview workspace tabs and snapshots. */
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

/** Creates the default browser-backed workspace client used by the shell hook. */
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

/** Default workspace client for local development and the current production wiring. */
export const dockviewWorkspaceClient = createLocalDockviewWorkspaceClient()
