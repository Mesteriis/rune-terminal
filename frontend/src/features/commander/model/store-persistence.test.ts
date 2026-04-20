import { beforeEach, describe, expect, it, vi } from 'vitest'

import { attachCommanderWidgetsPersistence } from '@/features/commander/model/store-persistence'
import type {
  CommanderWidgetPersistedSnapshot,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

type CommanderWidgetsWatcher = (widgets: Record<string, CommanderWidgetRuntimeState>) => void

function createCommanderWidgetsStoreMock() {
  let watcher: CommanderWidgetsWatcher | null = null
  const unsubscribe = vi.fn()

  return {
    store: {
      watch(nextWatcher: CommanderWidgetsWatcher) {
        watcher = nextWatcher
        return { unsubscribe }
      },
    },
    emit(widgets: Record<string, CommanderWidgetRuntimeState>) {
      watcher?.(widgets)
    },
    unsubscribe,
  }
}

function createPersistenceDeps() {
  return {
    getCommanderClientSnapshot: vi.fn((_widgetId: string) => ({ directories: {} })),
    serializeCommanderWidgetRuntimeState: vi.fn(
      (_widgetState: CommanderWidgetRuntimeState) =>
        ({
          activePane: 'left',
          viewMode: 'split',
          showHidden: false,
          sortMode: 'name',
          sortDirection: 'asc',
          dirsFirst: true,
          leftPane: {
            path: '~/left',
            filterQuery: '',
            entries: [],
            cursorEntryId: null,
            selectionAnchorEntryId: null,
            selectedIds: [],
            historyBack: [],
            historyForward: [],
          },
          rightPane: {
            path: '~/right',
            filterQuery: '',
            entries: [],
            cursorEntryId: null,
            selectionAnchorEntryId: null,
            selectedIds: [],
            historyBack: [],
            historyForward: [],
          },
        }) satisfies CommanderWidgetPersistedSnapshot['runtime'],
    ),
    writePersistedCommanderWidgets: vi.fn(),
  }
}

describe('commander store persistence attachment', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
  })

  it('skips the first watch emission and debounces later writes', () => {
    const deps = createPersistenceDeps()
    const store = createCommanderWidgetsStoreMock()
    const detach = attachCommanderWidgetsPersistence(store.store, deps)
    const widgets = { 'widget-1': {} as CommanderWidgetRuntimeState }

    store.emit(widgets)
    expect(deps.writePersistedCommanderWidgets).not.toHaveBeenCalled()

    store.emit(widgets)
    store.emit(widgets)

    vi.advanceTimersByTime(119)
    expect(deps.writePersistedCommanderWidgets).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(deps.writePersistedCommanderWidgets).toHaveBeenCalledTimes(1)

    detach()
  })

  it('keeps initialization state isolated per attachment and cleans up pending timers', () => {
    const deps = createPersistenceDeps()
    const firstStore = createCommanderWidgetsStoreMock()
    const secondStore = createCommanderWidgetsStoreMock()
    const widgets = { 'widget-1': {} as CommanderWidgetRuntimeState }

    const detachFirst = attachCommanderWidgetsPersistence(firstStore.store, deps)
    const detachSecond = attachCommanderWidgetsPersistence(secondStore.store, deps)

    firstStore.emit(widgets)
    secondStore.emit(widgets)
    expect(deps.writePersistedCommanderWidgets).not.toHaveBeenCalled()

    firstStore.emit(widgets)
    detachFirst()
    vi.runAllTimers()

    expect(deps.writePersistedCommanderWidgets).not.toHaveBeenCalled()

    secondStore.emit(widgets)
    vi.runAllTimers()

    expect(deps.writePersistedCommanderWidgets).toHaveBeenCalledTimes(1)
    expect(firstStore.unsubscribe).toHaveBeenCalledTimes(1)
    expect(secondStore.unsubscribe).not.toHaveBeenCalled()

    detachSecond()
    expect(secondStore.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
