import { readCommanderDirectory, resolveCommanderExistingPath } from '@/features/commander/model/fake-client'
import { filterEntriesByMask } from '@/features/commander/model/store-selection'
import type {
  CommanderFileDialogState,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderPendingOperation,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

export type CommanderWidgetRefreshOverrides = {
  pendingOperation?: CommanderPendingOperation | null
  fileDialog?: CommanderFileDialogState | null
  leftPane?: Partial<CommanderPaneRuntimeState>
  rightPane?: Partial<CommanderPaneRuntimeState>
}

/** Returns one pane runtime slice from a widget-scoped commander state object. */
export function getPaneState(widgetState: CommanderWidgetRuntimeState, paneId: CommanderPaneId) {
  return paneId === 'left' ? widgetState.leftPane : widgetState.rightPane
}

/** Replaces one pane runtime slice without touching the rest of the widget state. */
export function setPaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  paneState: CommanderPaneRuntimeState,
) {
  if (paneId === 'left') {
    return {
      ...widgetState,
      leftPane: paneState,
    }
  }

  return {
    ...widgetState,
    rightPane: paneState,
  }
}

/** Applies a pane-local updater and writes the result back into the widget state. */
export function updatePaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  updater: (paneState: CommanderPaneRuntimeState) => CommanderPaneRuntimeState,
) {
  return setPaneState(widgetState, paneId, updater(getPaneState(widgetState, paneId)))
}

/** Rebuilds a pane from fake-client directory state while preserving valid cursor and selection state. */
export function rebuildPaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneState: CommanderPaneRuntimeState,
  nextPath = paneState.path,
) {
  const resolvedPath = resolveCommanderExistingPath(widgetState.widgetId, nextPath)
  const snapshot = readCommanderDirectory(widgetState.widgetId, resolvedPath, {
    showHidden: widgetState.showHidden,
    sortMode: widgetState.sortMode,
    sortDirection: widgetState.sortDirection,
    dirsFirst: widgetState.dirsFirst,
  })
  const filteredEntries = filterEntriesByMask(snapshot.entries, paneState.filterQuery, {
    emptyMeansAll: true,
  })
  const visibleEntryIds = new Set(filteredEntries.map((entry) => entry.id))
  const nextSelectedIds =
    paneState.path === resolvedPath
      ? paneState.selectedIds.filter((entryId) => visibleEntryIds.has(entryId))
      : []
  const nextCursorEntryId =
    paneState.path === resolvedPath && paneState.cursorEntryId && visibleEntryIds.has(paneState.cursorEntryId)
      ? paneState.cursorEntryId
      : (snapshot.entries[0]?.id ?? null)
  const nextSelectionAnchorEntryId =
    paneState.path === resolvedPath &&
    paneState.selectionAnchorEntryId &&
    visibleEntryIds.has(paneState.selectionAnchorEntryId)
      ? paneState.selectionAnchorEntryId
      : nextCursorEntryId

  return {
    ...paneState,
    path: resolvedPath,
    entries: filteredEntries,
    selectedIds: nextSelectedIds,
    cursorEntryId: nextCursorEntryId,
    selectionAnchorEntryId: nextSelectionAnchorEntryId,
  }
}

/** Navigates one pane to a new path and updates its local back/forward history. */
export function navigatePaneState(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  nextPath: string,
) {
  return updatePaneState(widgetState, paneId, (paneState) => {
    if (paneState.path === nextPath) {
      return rebuildPaneState(widgetState, paneState)
    }

    const rebuiltPaneState = rebuildPaneState(widgetState, paneState, nextPath)

    return {
      ...rebuiltPaneState,
      historyBack: [...paneState.historyBack, paneState.path],
      historyForward: [],
    }
  })
}

/** Walks one pane backward or forward through its local navigation history. */
export function navigatePaneHistory(
  widgetState: CommanderWidgetRuntimeState,
  paneId: CommanderPaneId,
  direction: 'back' | 'forward',
) {
  return updatePaneState(widgetState, paneId, (paneState) => {
    const historyStack = direction === 'back' ? paneState.historyBack : paneState.historyForward
    const targetPath = historyStack[historyStack.length - 1]

    if (!targetPath) {
      return paneState
    }

    const rebuiltPaneState = rebuildPaneState(widgetState, paneState, targetPath)

    if (direction === 'back') {
      return {
        ...rebuiltPaneState,
        historyBack: paneState.historyBack.slice(0, -1),
        historyForward: [...paneState.historyForward, paneState.path],
      }
    }

    return {
      ...rebuiltPaneState,
      historyBack: [...paneState.historyBack, paneState.path],
      historyForward: paneState.historyForward.slice(0, -1),
    }
  })
}

/** Rebuilds both panes after a mutation while allowing targeted widget-level overrides. */
export function refreshWidgetPanes(
  widgetState: CommanderWidgetRuntimeState,
  overrides?: CommanderWidgetRefreshOverrides,
) {
  const hasPendingOperationOverride = Boolean(
    overrides && Object.prototype.hasOwnProperty.call(overrides, 'pendingOperation'),
  )
  const hasFileDialogOverride = Boolean(
    overrides && Object.prototype.hasOwnProperty.call(overrides, 'fileDialog'),
  )
  const nextWidgetState = {
    ...widgetState,
    pendingOperation: hasPendingOperationOverride
      ? (overrides?.pendingOperation ?? null)
      : widgetState.pendingOperation,
    fileDialog: hasFileDialogOverride ? (overrides?.fileDialog ?? null) : widgetState.fileDialog,
    leftPane: {
      ...widgetState.leftPane,
      ...overrides?.leftPane,
    },
    rightPane: {
      ...widgetState.rightPane,
      ...overrides?.rightPane,
    },
  }

  return {
    ...nextWidgetState,
    leftPane: rebuildPaneState(nextWidgetState, nextWidgetState.leftPane),
    rightPane: rebuildPaneState(nextWidgetState, nextWidgetState.rightPane),
  }
}
