import { beforeEach, describe, expect, it } from 'vitest'

import { createLocalDockviewWorkspaceClient } from './dockview-workspace.client'
import { type PersistedDockviewWorkspaceState } from './dockview-workspace.persistence'

const STORAGE_KEY = 'dockview-workspace-client-test'

function createPersistedWorkspaceState(): PersistedDockviewWorkspaceState {
  return {
    activeWorkspaceId: 2,
    workspaceTabs: [
      { id: 1, title: 'Workspace-1', snapshot: null },
      { id: 2, title: 'Workspace-2', snapshot: null },
    ],
  }
}

describe('dockview workspace client', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('round-trips workspace state through the default localStorage client adapter', () => {
    const client = createLocalDockviewWorkspaceClient({
      storage: window.localStorage,
      storageKey: STORAGE_KEY,
    })
    const state = createPersistedWorkspaceState()

    client.writeState(state)

    expect(client.readState()).toEqual(state)
  })

  it('normalizes invalid persisted payloads to null', () => {
    const client = createLocalDockviewWorkspaceClient({
      storage: window.localStorage,
      storageKey: STORAGE_KEY,
    })

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeWorkspaceId: 'two',
        workspaceTabs: [],
      }),
    )

    expect(client.readState()).toBeNull()
  })
})
