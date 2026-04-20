import type {
  CommanderClientEntrySnapshot,
  CommanderPanePersistedState,
  CommanderPaneRuntimeState,
  CommanderWidgetPersistedSnapshot,
  CommanderWidgetPersistedState,
  CommanderWidgetRuntimeState,
} from './types'

const COMMANDER_WIDGETS_STORAGE_KEY = 'runa-terminal:commander-widgets:v1'

type CommanderPersistenceState = {
  widgets: Record<string, CommanderWidgetPersistedSnapshot>
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizePaneState(value: unknown): CommanderPanePersistedState | null {
  if (!isObjectRecord(value)) {
    return null
  }

  if (
    typeof value.path !== 'string'
    || (value.filterQuery !== undefined && typeof value.filterQuery !== 'string')
    || !Array.isArray(value.entries)
    || (value.cursorEntryId !== null && typeof value.cursorEntryId !== 'string')
    || (value.selectionAnchorEntryId !== null && typeof value.selectionAnchorEntryId !== 'string')
    || !isStringArray(value.selectedIds)
    || !isStringArray(value.historyBack)
    || !isStringArray(value.historyForward)
  ) {
    return null
  }

  return {
    path: value.path,
    filterQuery: value.filterQuery ?? '',
    entries: value.entries,
    cursorEntryId: value.cursorEntryId,
    selectionAnchorEntryId: value.selectionAnchorEntryId ?? value.cursorEntryId ?? null,
    selectedIds: value.selectedIds,
    historyBack: value.historyBack,
    historyForward: value.historyForward,
  } as CommanderPanePersistedState
}

function normalizeWidgetState(value: unknown): CommanderWidgetPersistedSnapshot | null {
  if (!isObjectRecord(value) || !isObjectRecord(value.runtime) || !isObjectRecord(value.client)) {
    return null
  }

  const leftPane = normalizePaneState(value.runtime.leftPane)
  const rightPane = normalizePaneState(value.runtime.rightPane)

  if (
    !leftPane
    || !rightPane
    || (value.runtime.activePane !== 'left' && value.runtime.activePane !== 'right')
    || (value.runtime.viewMode !== 'commander' && value.runtime.viewMode !== 'split' && value.runtime.viewMode !== 'terminal')
    || typeof value.runtime.showHidden !== 'boolean'
    || (value.runtime.sortMode !== 'name' && value.runtime.sortMode !== 'ext' && value.runtime.sortMode !== 'modified')
    || !isObjectRecord(value.client.directories)
  ) {
    return null
  }

  return {
    runtime: {
      activePane: value.runtime.activePane,
      viewMode: value.runtime.viewMode,
      showHidden: value.runtime.showHidden,
      sortMode: value.runtime.sortMode,
      leftPane,
      rightPane,
    },
    client: {
      directories: value.client.directories as Record<string, CommanderClientEntrySnapshot[]>,
    },
  }
}

function readPersistenceState(): CommanderPersistenceState {
  if (typeof window === 'undefined') {
    return { widgets: {} }
  }

  try {
    const rawValue = window.localStorage.getItem(COMMANDER_WIDGETS_STORAGE_KEY)

    if (!rawValue) {
      return { widgets: {} }
    }

    const parsedValue = JSON.parse(rawValue) as { widgets?: Record<string, unknown> }

    if (!isObjectRecord(parsedValue.widgets)) {
      return { widgets: {} }
    }

    const widgets = Object.fromEntries(
      Object.entries(parsedValue.widgets)
        .map(([widgetId, widgetState]) => [widgetId, normalizeWidgetState(widgetState)] as const)
        .filter((entry): entry is [string, CommanderWidgetPersistedSnapshot] => Boolean(entry[1])),
    )

    return { widgets }
  } catch {
    return { widgets: {} }
  }
}

export function readPersistedCommanderWidget(widgetId: string) {
  return readPersistenceState().widgets[widgetId] ?? null
}

export function writePersistedCommanderWidgets(widgets: Record<string, CommanderWidgetPersistedSnapshot>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    COMMANDER_WIDGETS_STORAGE_KEY,
    JSON.stringify({ widgets } satisfies CommanderPersistenceState),
  )
}

function serializePaneState(paneState: CommanderPaneRuntimeState): CommanderPanePersistedState {
  return {
    path: paneState.path,
    filterQuery: paneState.filterQuery,
    entries: paneState.entries,
    cursorEntryId: paneState.cursorEntryId,
    selectionAnchorEntryId: paneState.selectionAnchorEntryId,
    selectedIds: paneState.selectedIds,
    historyBack: paneState.historyBack,
    historyForward: paneState.historyForward,
  }
}

export function serializeCommanderWidgetRuntimeState(
  widgetState: CommanderWidgetRuntimeState,
): CommanderWidgetPersistedState {
  return {
    activePane: widgetState.activePane,
    viewMode: widgetState.viewMode,
    showHidden: widgetState.showHidden,
    sortMode: widgetState.sortMode,
    leftPane: serializePaneState(widgetState.leftPane),
    rightPane: serializePaneState(widgetState.rightPane),
  }
}
