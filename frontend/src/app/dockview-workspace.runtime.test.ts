import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDockviewWorkspacePersistenceController } from './dockview-workspace.runtime'

function createDockviewApiMock() {
  const listeners: Array<() => void> = []
  const disposables = Array.from({ length: 8 }, () => ({ dispose: vi.fn() }))

  const register = (index: number) => (listener: () => void) => {
    listeners[index] = listener
    return disposables[index]
  }

  return {
    api: {
      onDidLayoutChange: register(0),
      onDidAddPanel: register(1),
      onDidRemovePanel: register(2),
      onDidMovePanel: register(3),
      onDidAddGroup: register(4),
      onDidRemoveGroup: register(5),
      onDidActivePanelChange: register(6),
      onDidActiveGroupChange: register(7),
    },
    disposables,
    listeners,
  }
}

describe('dockview workspace persistence controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('debounces repeated workspace mutation notifications into one persist call', () => {
    const onPersistWorkspaceSnapshot = vi.fn()
    const controller = createDockviewWorkspacePersistenceController({
      debounceMs: 120,
      onPersistWorkspaceSnapshot,
    })
    const { api, listeners } = createDockviewApiMock()

    controller.bind(api as never)

    listeners[0]?.()
    listeners[1]?.()
    listeners[6]?.()

    expect(onPersistWorkspaceSnapshot).not.toHaveBeenCalled()

    vi.advanceTimersByTime(119)
    expect(onPersistWorkspaceSnapshot).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onPersistWorkspaceSnapshot).toHaveBeenCalledTimes(1)
  })

  it('disposes bindings and cancels pending persistence work', () => {
    const onPersistWorkspaceSnapshot = vi.fn()
    const controller = createDockviewWorkspacePersistenceController({
      debounceMs: 120,
      onPersistWorkspaceSnapshot,
    })
    const { api, disposables, listeners } = createDockviewApiMock()

    controller.bind(api as never)
    listeners[0]?.()
    controller.dispose()

    vi.runAllTimers()

    expect(onPersistWorkspaceSnapshot).not.toHaveBeenCalled()
    expect(disposables.every((disposable) => disposable.dispose.mock.calls.length === 1)).toBe(true)
  })
})
