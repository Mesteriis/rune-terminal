import type { CommanderWidgetPersistedSnapshot, CommanderWidgetRuntimeState } from '@/features/commander/model/types'
import { getCommanderClientSnapshot } from '@/features/commander/model/fake-client'
import {
  serializeCommanderWidgetRuntimeState,
  writePersistedCommanderWidgets,
} from '@/features/commander/model/persistence'

const COMMANDER_PERSIST_DEBOUNCE_MS = 120

type CommanderWidgetsStore = {
  watch: (watcher: (widgets: Record<string, CommanderWidgetRuntimeState>) => void) => void
}

let persistCommanderWidgetsTimeout: ReturnType<typeof setTimeout> | null = null
let hasInitializedCommanderPersistence = false

export function attachCommanderWidgetsPersistence(commanderWidgetsStore: CommanderWidgetsStore) {
  commanderWidgetsStore.watch((widgets) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!hasInitializedCommanderPersistence) {
      hasInitializedCommanderPersistence = true
      return
    }

    if (persistCommanderWidgetsTimeout) {
      clearTimeout(persistCommanderWidgetsTimeout)
    }

    persistCommanderWidgetsTimeout = window.setTimeout(() => {
      writePersistedCommanderWidgets(
        Object.fromEntries(
          Object.entries(widgets).map(([widgetId, widgetState]) => [
            widgetId,
            {
              runtime: serializeCommanderWidgetRuntimeState(widgetState),
              client: getCommanderClientSnapshot(widgetId),
            } satisfies CommanderWidgetPersistedSnapshot,
          ]),
        ),
      )
    }, COMMANDER_PERSIST_DEBOUNCE_MS)
  })
}
