import type {
  CommanderWidgetPersistedSnapshot,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'
import { getCommanderClientSnapshot } from '@/features/commander/model/fake-client'
import {
  serializeCommanderWidgetRuntimeState,
  writePersistedCommanderWidgets,
} from '@/features/commander/model/persistence'

const COMMANDER_PERSIST_DEBOUNCE_MS = 120

type CommanderWidgetsWatchSubscription = void | (() => void) | { unsubscribe: () => void }

type CommanderWidgetsStore = {
  watch: (
    watcher: (widgets: Record<string, CommanderWidgetRuntimeState>) => void,
  ) => CommanderWidgetsWatchSubscription
}

type CommanderWidgetsPersistenceDeps = {
  getCommanderClientSnapshot: (widgetId: string) => CommanderWidgetPersistedSnapshot['client']
  serializeCommanderWidgetRuntimeState: (
    widgetState: CommanderWidgetRuntimeState,
  ) => CommanderWidgetPersistedSnapshot['runtime']
  writePersistedCommanderWidgets: (widgets: Record<string, CommanderWidgetPersistedSnapshot>) => void
}

const defaultCommanderWidgetsPersistenceDeps: CommanderWidgetsPersistenceDeps = {
  getCommanderClientSnapshot,
  serializeCommanderWidgetRuntimeState,
  writePersistedCommanderWidgets,
}

function disposeCommanderWidgetsWatchSubscription(subscription: CommanderWidgetsWatchSubscription) {
  if (typeof subscription === 'function') {
    subscription()
    return
  }

  subscription?.unsubscribe?.()
}

export function attachCommanderWidgetsPersistence(
  commanderWidgetsStore: CommanderWidgetsStore,
  deps: CommanderWidgetsPersistenceDeps = defaultCommanderWidgetsPersistenceDeps,
) {
  let hasInitializedCommanderPersistence = false
  let persistCommanderWidgetsTimeout: ReturnType<typeof setTimeout> | null = null

  const watchSubscription = commanderWidgetsStore.watch((widgets) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!hasInitializedCommanderPersistence) {
      hasInitializedCommanderPersistence = true
      return
    }

    if (persistCommanderWidgetsTimeout !== null) {
      clearTimeout(persistCommanderWidgetsTimeout)
    }

    persistCommanderWidgetsTimeout = window.setTimeout(() => {
      persistCommanderWidgetsTimeout = null

      deps.writePersistedCommanderWidgets(
        Object.fromEntries(
          Object.entries(widgets).map(([widgetId, widgetState]) => [
            widgetId,
            {
              runtime: deps.serializeCommanderWidgetRuntimeState(widgetState),
              client: deps.getCommanderClientSnapshot(widgetId),
            } satisfies CommanderWidgetPersistedSnapshot,
          ]),
        ),
      )
    }, COMMANDER_PERSIST_DEBOUNCE_MS)
  })

  return () => {
    if (persistCommanderWidgetsTimeout !== null) {
      clearTimeout(persistCommanderWidgetsTimeout)
      persistCommanderWidgetsTimeout = null
    }

    disposeCommanderWidgetsWatchSubscription(watchSubscription)
  }
}
