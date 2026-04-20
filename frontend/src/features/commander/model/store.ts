import { createEvent, createStore } from 'effector'

import {
  copyCommanderEntries,
  createCommanderWidgetRuntimeState,
  deleteCommanderEntries,
  getCommanderConflictingEntryNames,
  getCommanderEntryNameConflict,
  getCommanderParentPath,
  hydrateCommanderClient,
  mkdirCommanderDirectory,
  moveCommanderEntries,
  openCommanderEntry,
  previewCommanderRenameEntries,
  renameCommanderEntry,
  renameCommanderEntries,
  writeCommanderFile,
} from '@/features/commander/model/fake-client'
import { attachCommanderWidgetsPersistence } from '@/features/commander/model/store-persistence'
import {
  applyPendingTransferOperation,
  createCommanderFileDialog,
  createPendingOperation,
  finalizePendingTransferOperation,
  getCurrentPendingConflictName,
  removePendingTransferEntry,
} from '@/features/commander/model/store-operations'
import {
  getPaneState,
  navigatePaneHistory,
  navigatePaneState,
  rebuildPaneState,
  refreshWidgetPanes,
  updatePaneState,
} from '@/features/commander/model/store-navigation'
import {
  applySelectionMaskToPane,
  getCommanderFilterMatches,
  getCommanderMaskMatches,
  getCommanderResolvedSearchMatchIndex,
  getCommanderSearchMatches,
  invertPaneSelection,
  movePaneCursor,
  movePaneCursorWithSelection,
  setCursorToBoundary,
  setCursorToBoundaryWithSelection,
  setSelectionRangeAtCursor,
  toggleEntrySelection,
} from '@/features/commander/model/store-selection'
import type {
  CommanderPaneId,
  CommanderSortDirection,
  CommanderSortMode,
  CommanderViewMode,
  CommanderWidgetPersistedSnapshot,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

type CommanderWidgetPayload = {
  widgetId: string
}

type CommanderMountWidgetPayload = CommanderWidgetPayload & {
  persistedWidget?: CommanderWidgetPersistedSnapshot | null
}

type CommanderWidgetPanePayload = CommanderWidgetPayload & {
  paneId: CommanderPaneId
}

type CommanderSetPaneCursorPayload = CommanderWidgetPanePayload & {
  entryId: string
  rangeSelect?: boolean
}

type CommanderMoveCursorPayload = CommanderWidgetPanePayload & {
  delta: number
  extendSelection?: boolean
}

type CommanderToggleEntrySelectionPayload = CommanderWidgetPanePayload & {
  entryId: string
}

type CommanderSetPaneBoundaryCursorPayload = CommanderWidgetPanePayload & {
  boundary: 'start' | 'end'
  extendSelection?: boolean
}

type CommanderSetViewModePayload = CommanderWidgetPayload & {
  viewMode: CommanderViewMode
}

type CommanderSetSortModePayload = CommanderWidgetPayload & {
  sortMode: CommanderSortMode
}

type CommanderSetPendingOperationInputPayload = CommanderWidgetPayload & {
  inputValue: string
}

type CommanderSetPanePathPayload = CommanderWidgetPanePayload & {
  path: string
}

type CommanderResolvePendingConflictPayload = CommanderWidgetPayload & {
  resolution: 'overwrite-current' | 'skip-current' | 'overwrite-all' | 'skip-all'
}

type CommanderOpenEntryPayload = CommanderWidgetPanePayload & {
  entryId: string
}

export const mountCommanderWidget = createEvent<CommanderMountWidgetPayload>()
export const setCommanderActivePane = createEvent<CommanderWidgetPanePayload>()
export const toggleCommanderShowHidden = createEvent<CommanderWidgetPayload>()
export const toggleCommanderDirsFirst = createEvent<CommanderWidgetPayload>()
export const setCommanderViewMode = createEvent<CommanderSetViewModePayload>()
export const setCommanderSortMode = createEvent<CommanderSetSortModePayload>()
export const setCommanderPaneCursor = createEvent<CommanderSetPaneCursorPayload>()
export const moveCommanderPaneCursor = createEvent<CommanderMoveCursorPayload>()
export const moveCommanderActivePaneCursor = createEvent<CommanderWidgetPayload & { delta: number; extendSelection?: boolean }>()
export const toggleCommanderPaneSelection = createEvent<CommanderToggleEntrySelectionPayload>()
export const toggleCommanderActivePaneSelection = createEvent<CommanderWidgetPayload & { advance?: boolean }>()
export const openCommanderPaneEntry = createEvent<CommanderOpenEntryPayload>()
export const openCommanderActivePaneEntry = createEvent<CommanderWidgetPayload>()
export const goCommanderPaneParent = createEvent<CommanderWidgetPanePayload>()
export const goCommanderActivePaneParent = createEvent<CommanderWidgetPayload>()
export const goCommanderPaneHistoryBack = createEvent<CommanderWidgetPanePayload>()
export const goCommanderPaneHistoryForward = createEvent<CommanderWidgetPanePayload>()
export const goCommanderActivePaneHistoryBack = createEvent<CommanderWidgetPayload>()
export const goCommanderActivePaneHistoryForward = createEvent<CommanderWidgetPayload>()
export const switchCommanderActivePane = createEvent<CommanderWidgetPayload>()
export const setCommanderPaneBoundaryCursor = createEvent<CommanderSetPaneBoundaryCursorPayload>()
export const requestCommanderActivePaneCopy = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneMove = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneDelete = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneMkdir = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneRename = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneSelectByMask = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneUnselectByMask = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneFilter = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneSearch = createEvent<CommanderWidgetPayload>()
export const stepCommanderPendingSearchMatch = createEvent<CommanderWidgetPayload & { delta: 1 | -1 }>()
export const requestCommanderActivePaneView = createEvent<CommanderWidgetPayload>()
export const requestCommanderActivePaneEdit = createEvent<CommanderWidgetPayload>()
export const clearCommanderActivePaneFilter = createEvent<CommanderWidgetPayload>()
export const invertCommanderActivePaneSelection = createEvent<CommanderWidgetPayload>()
export const setCommanderPanePath = createEvent<CommanderSetPanePathPayload>()
export const setCommanderPendingOperationInput = createEvent<CommanderSetPendingOperationInputPayload>()
export const setCommanderFileDialogDraft = createEvent<CommanderSetPendingOperationInputPayload>()
export const saveCommanderFileDialog = createEvent<CommanderWidgetPayload>()
export const closeCommanderFileDialog = createEvent<CommanderWidgetPayload>()
export const confirmCommanderPendingOperation = createEvent<CommanderWidgetPayload>()
export const cancelCommanderPendingOperation = createEvent<CommanderWidgetPayload>()
export const resolveCommanderPendingConflict = createEvent<CommanderResolvePendingConflictPayload>()

export const $commanderWidgets = createStore<Record<string, CommanderWidgetRuntimeState>>({})
  .on(mountCommanderWidget, (widgets, payload) => {
    if (widgets[payload.widgetId]) {
      return widgets
    }

    hydrateCommanderClient(payload.widgetId, payload.persistedWidget?.client)

    return {
      ...widgets,
      [payload.widgetId]: createCommanderWidgetRuntimeState(
        payload.widgetId,
        payload.persistedWidget?.runtime,
      ),
    }
  })
  .on(setCommanderActivePane, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        activePane: payload.paneId,
      },
    }
  })
  .on(toggleCommanderShowHidden, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const nextWidgetState = {
      ...widgetState,
      showHidden: !widgetState.showHidden,
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      },
    }
  })
  .on(toggleCommanderDirsFirst, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const nextWidgetState = {
      ...widgetState,
      dirsFirst: !widgetState.dirsFirst,
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      },
    }
  })
  .on(setCommanderViewMode, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || widgetState.viewMode === payload.viewMode) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        viewMode: payload.viewMode,
      },
    }
  })
  .on(setCommanderSortMode, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const nextSortDirection: CommanderSortDirection = widgetState.sortMode === payload.sortMode
      ? (widgetState.sortDirection === 'asc' ? 'desc' : 'asc')
      : 'asc'
    const nextWidgetState = {
      ...widgetState,
      sortMode: payload.sortMode,
      sortDirection: nextSortDirection,
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      },
    }
  })
  .on(setCommanderPaneCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => {
          if (!paneState.entries.some((entry) => entry.id === payload.entryId)) {
            return paneState
          }

          if (payload.rangeSelect) {
            return setSelectionRangeAtCursor(paneState, payload.entryId)
          }

          return {
            ...paneState,
            cursorEntryId: payload.entryId,
            selectionAnchorEntryId: payload.entryId,
          }
        },
      ),
    }
  })
  .on(moveCommanderPaneCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => payload.extendSelection
          ? movePaneCursorWithSelection(paneState, payload.delta)
          : movePaneCursor(paneState, payload.delta),
      ),
    }
  })
  .on(moveCommanderActivePaneCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(widgetState, widgetState.activePane, (paneState) => (
        payload.extendSelection
          ? movePaneCursorWithSelection(paneState, payload.delta)
          : movePaneCursor(paneState, payload.delta)
      )),
    }
  })
  .on(toggleCommanderPaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => toggleEntrySelection(paneState, payload.entryId),
      ),
    }
  })
  .on(toggleCommanderActivePaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const activePaneState = getPaneState(widgetState, widgetState.activePane)
    const entryId = activePaneState.cursorEntryId

    if (!entryId) {
      return widgets
    }

    let nextWidgetState = updatePaneState(widgetState, widgetState.activePane, (paneState) => (
      toggleEntrySelection(paneState, entryId)
    ))

    if (payload.advance) {
      nextWidgetState = updatePaneState(nextWidgetState, widgetState.activePane, (paneState) => (
        movePaneCursor(paneState, 1)
      ))
    }

    return {
      ...widgets,
      [payload.widgetId]: nextWidgetState,
    }
  })
  .on(requestCommanderActivePaneView, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || widgetState.pendingOperation) {
      return widgets
    }

    const fileDialog = createCommanderFileDialog(widgetState, widgetState.activePane, 'view')

    if (!fileDialog) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        fileDialog,
      },
    }
  })
  .on(requestCommanderActivePaneEdit, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || widgetState.pendingOperation) {
      return widgets
    }

    const fileDialog = createCommanderFileDialog(widgetState, widgetState.activePane, 'edit')

    if (!fileDialog) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        fileDialog,
      },
    }
  })
  .on(setCommanderFileDialogDraft, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.fileDialog) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        fileDialog: {
          ...widgetState.fileDialog,
          draftValue: payload.inputValue,
        },
      },
    }
  })
  .on(saveCommanderFileDialog, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]
    const fileDialog = widgetState?.fileDialog

    if (!widgetState || !fileDialog || fileDialog.mode !== 'edit') {
      return widgets
    }

    const didSave = writeCommanderFile({
      widgetId: payload.widgetId,
      path: fileDialog.path,
      entryId: fileDialog.entryId,
      content: fileDialog.draftValue,
    })

    if (!didSave) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: refreshWidgetPanes(widgetState, {
        fileDialog: null,
      }),
    }
  })
  .on(closeCommanderFileDialog, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.fileDialog) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        fileDialog: null,
      },
    }
  })
  .on(openCommanderPaneEntry, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const navigationResult = openCommanderEntry(payload.widgetId, getPaneState(widgetState, payload.paneId).path, payload.entryId)

    if (!navigationResult || navigationResult.kind !== 'directory') {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        navigationResult.path,
      ),
    }
  })
  .on(openCommanderActivePaneEntry, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const activePaneState = getPaneState(widgetState, widgetState.activePane)
    const entryId = activePaneState.cursorEntryId

    if (!entryId) {
      return widgets
    }

    const navigationResult = openCommanderEntry(payload.widgetId, activePaneState.path, entryId)

    if (!navigationResult || navigationResult.kind !== 'directory') {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(widgetState, widgetState.activePane, navigationResult.path),
    }
  })
  .on(goCommanderPaneParent, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const paneState = getPaneState(widgetState, payload.paneId)
    const parentPath = getCommanderParentPath(paneState.path)

    if (!parentPath) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        parentPath,
      ),
    }
  })
  .on(goCommanderActivePaneParent, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const paneState = getPaneState(widgetState, widgetState.activePane)
    const parentPath = getCommanderParentPath(paneState.path)

    if (!parentPath) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(widgetState, widgetState.activePane, parentPath),
    }
  })
  .on(goCommanderPaneHistoryBack, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        'back',
      ),
    }
  })
  .on(goCommanderPaneHistoryForward, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        'forward',
      ),
    }
  })
  .on(goCommanderActivePaneHistoryBack, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(widgetState, widgetState.activePane, 'back'),
    }
  })
  .on(goCommanderActivePaneHistoryForward, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneHistory(widgetState, widgetState.activePane, 'forward'),
    }
  })
  .on(switchCommanderActivePane, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        activePane: widgetState.activePane === 'left' ? 'right' : 'left',
      },
    }
  })
  .on(setCommanderPaneBoundaryCursor, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => payload.extendSelection
          ? setCursorToBoundaryWithSelection(paneState, payload.boundary)
          : setCursorToBoundary(paneState, payload.boundary),
      ),
    }
  })
  .on(requestCommanderActivePaneCopy, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'copy')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneMove, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'move')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneDelete, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'delete')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneMkdir, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'mkdir')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneRename, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'rename')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneSelectByMask, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'select')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneUnselectByMask, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'unselect')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneFilter, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'filter')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(requestCommanderActivePaneSearch, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }
    const pendingOperation = createPendingOperation(widgetState, 'search')

    return {
      ...widgets,
      [payload.widgetId]: pendingOperation
        ? {
          ...widgetState,
          pendingOperation,
        }
        : widgetState,
    }
  })
  .on(stepCommanderPendingSearchMatch, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.pendingOperation || widgetState.pendingOperation.kind !== 'search') {
      return widgets
    }

    const sourcePane = getPaneState(widgetState, widgetState.pendingOperation.sourcePaneId)
    const matches = getCommanderSearchMatches(sourcePane, widgetState.pendingOperation.inputValue ?? '')

    if (matches.entryIds.length === 0) {
      return widgets
    }

    const currentIndex = getCommanderResolvedSearchMatchIndex(
      matches.entryIds,
      sourcePane.cursorEntryId,
      widgetState.pendingOperation.matchIndex ?? 0,
    )
    const nextIndex = (currentIndex + payload.delta + matches.entryIds.length) % matches.entryIds.length
    const nextCursorEntryId = matches.entryIds[nextIndex] ?? null

    if (!nextCursorEntryId) {
      return widgets
    }

    const nextWidgetState = updatePaneState(widgetState, widgetState.pendingOperation.sourcePaneId, (paneState) => ({
      ...paneState,
      cursorEntryId: nextCursorEntryId,
      selectionAnchorEntryId: nextCursorEntryId,
    }))

    return {
      ...widgets,
      [payload.widgetId]: {
        ...nextWidgetState,
        pendingOperation: {
          ...nextWidgetState.pendingOperation!,
          matchCount: matches.entryIds.length,
          matchPreview: matches.entryNames.slice(0, 6),
          matchIndex: nextIndex,
        },
      },
    }
  })
  .on(clearCommanderActivePaneFilter, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(widgetState, widgetState.activePane, (paneState) => (
        rebuildPaneState(widgetState, {
          ...paneState,
          filterQuery: '',
        })
      )),
    }
  })
  .on(setCommanderPanePath, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    const nextPath = payload.path.trim()

    if (!nextPath) {
      return widgets
    }

    const currentPaneState = getPaneState(widgetState, payload.paneId)

    if (currentPaneState.path === nextPath) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: navigatePaneState(widgetState, payload.paneId, nextPath),
    }
  })
  .on(invertCommanderActivePaneSelection, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: updatePaneState(widgetState, widgetState.activePane, invertPaneSelection),
    }
  })
  .on(setCommanderPendingOperationInput, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.pendingOperation) {
      return widgets
    }

    if (widgetState.pendingOperation.kind === 'select' || widgetState.pendingOperation.kind === 'unselect') {
      const matches = getCommanderMaskMatches(
        getPaneState(widgetState, widgetState.pendingOperation.sourcePaneId),
        payload.inputValue,
      )

      return {
        ...widgets,
        [payload.widgetId]: {
          ...widgetState,
          pendingOperation: {
            ...widgetState.pendingOperation,
            inputValue: payload.inputValue,
            matchCount: matches.entryIds.length,
            matchPreview: matches.entryNames.slice(0, 6),
          },
        },
      }
    }

    if (widgetState.pendingOperation.kind === 'filter') {
      const matches = getCommanderFilterMatches(
        widgetState,
        widgetState.pendingOperation.sourcePaneId,
        payload.inputValue,
      )

      return {
        ...widgets,
        [payload.widgetId]: {
          ...widgetState,
          pendingOperation: {
            ...widgetState.pendingOperation,
            inputValue: payload.inputValue,
            matchCount: matches.entryIds.length,
            matchPreview: matches.entryNames.slice(0, 6),
          },
        },
      }
    }

    if (widgetState.pendingOperation.kind === 'search') {
      const sourcePane = getPaneState(widgetState, widgetState.pendingOperation.sourcePaneId)
      const matches = getCommanderSearchMatches(
        sourcePane,
        payload.inputValue,
      )

      return {
        ...widgets,
        [payload.widgetId]: {
          ...widgetState,
          pendingOperation: {
            ...widgetState.pendingOperation,
            inputValue: payload.inputValue,
            matchCount: matches.entryIds.length,
            matchPreview: matches.entryNames.slice(0, 6),
            matchIndex: getCommanderResolvedSearchMatchIndex(
              matches.entryIds,
              sourcePane.cursorEntryId,
              0,
            ),
          },
        },
      }
    }

    if (widgetState.pendingOperation.kind !== 'rename') {
      return {
        ...widgets,
        [payload.widgetId]: {
          ...widgetState,
          pendingOperation: {
            ...widgetState.pendingOperation,
            inputValue: payload.inputValue,
            conflictEntryNames: undefined,
          },
        },
      }
    }

    const renamePreview = previewCommanderRenameEntries({
      widgetId: payload.widgetId,
      path: widgetState.pendingOperation.sourcePath,
      entryIds: widgetState.pendingOperation.entryIds,
      template: payload.inputValue,
    })

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        pendingOperation: {
          ...widgetState.pendingOperation,
          inputValue: payload.inputValue,
          conflictEntryNames: renamePreview.conflictEntryNames,
          duplicateTargetNames: renamePreview.duplicateTargetNames,
          renamePreview: renamePreview.preview,
        },
      },
    }
  })
  .on(confirmCommanderPendingOperation, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || !widgetState.pendingOperation) {
      return widgets
    }

    const pendingOperation = widgetState.pendingOperation

    if (pendingOperation.kind === 'copy' && pendingOperation.targetPath) {
      if (pendingOperation.conflictEntryNames?.length) {
        return widgets
      }

      copyCommanderEntries({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        targetPath: pendingOperation.targetPath,
        entryIds: pendingOperation.entryIds,
        overwrite: false,
      })

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (pendingOperation.kind === 'move' && pendingOperation.targetPath) {
      if (pendingOperation.conflictEntryNames?.length) {
        return widgets
      }

      moveCommanderEntries({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        targetPath: pendingOperation.targetPath,
        entryIds: pendingOperation.entryIds,
        overwrite: false,
      })

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (pendingOperation.kind === 'delete') {
      deleteCommanderEntries({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        entryIds: pendingOperation.entryIds,
      })

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (pendingOperation.kind === 'mkdir') {
      const mkdirResult = mkdirCommanderDirectory(payload.widgetId, pendingOperation.sourcePath)

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
          [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
            cursorEntryId: mkdirResult.entryId,
            selectedIds: [],
          },
        }),
      }
    }

    if (pendingOperation.kind === 'rename') {
      const nextName = pendingOperation.inputValue?.trim() ?? ''

      if (!nextName) {
        return widgets
      }

      if (pendingOperation.renameMode === 'batch') {
        const renamePreview = previewCommanderRenameEntries({
          widgetId: payload.widgetId,
          path: pendingOperation.sourcePath,
          entryIds: pendingOperation.entryIds,
          template: nextName,
        })

        if (renamePreview.duplicateTargetNames.length > 0) {
          return {
            ...widgets,
            [payload.widgetId]: {
              ...widgetState,
              pendingOperation: {
                ...pendingOperation,
                duplicateTargetNames: renamePreview.duplicateTargetNames,
                conflictEntryNames: renamePreview.conflictEntryNames,
                renamePreview: renamePreview.preview,
              },
            },
          }
        }

        if (
          !pendingOperation.conflictEntryNames?.length
          && renamePreview.conflictEntryNames.length > 0
        ) {
          return {
            ...widgets,
            [payload.widgetId]: {
              ...widgetState,
              pendingOperation: {
                ...pendingOperation,
                conflictEntryNames: renamePreview.conflictEntryNames,
                duplicateTargetNames: renamePreview.duplicateTargetNames,
                renamePreview: renamePreview.preview,
              },
            },
          }
        }

        const renameResult = renameCommanderEntries({
          widgetId: payload.widgetId,
          path: pendingOperation.sourcePath,
          entryIds: pendingOperation.entryIds,
          template: nextName,
          overwrite: Boolean(pendingOperation.conflictEntryNames?.length),
        })

        if (!renameResult) {
          return widgets
        }

        return {
          ...widgets,
          [payload.widgetId]: refreshWidgetPanes(widgetState, {
            pendingOperation: null,
            [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
              cursorEntryId: renameResult.entryIds[0] ?? null,
              selectedIds: [],
              selectionAnchorEntryId: renameResult.entryIds[0] ?? null,
            },
          }),
        }
      }

      const entryId = pendingOperation.entryIds[0]

      if (!entryId) {
        return widgets
      }

      if (
        !pendingOperation.conflictEntryNames?.length
        && getCommanderEntryNameConflict({
          widgetId: payload.widgetId,
          path: pendingOperation.sourcePath,
          name: nextName,
          ignoreEntryId: entryId,
        })
      ) {
        return {
          ...widgets,
          [payload.widgetId]: {
            ...widgetState,
            pendingOperation: {
              ...pendingOperation,
              conflictEntryNames: [nextName],
            },
          },
        }
      }

      const renameResult = renameCommanderEntry({
        widgetId: payload.widgetId,
        path: pendingOperation.sourcePath,
        entryId,
        nextName,
        overwrite: Boolean(pendingOperation.conflictEntryNames?.length),
      })

      if (!renameResult) {
        return widgets
      }

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
          [pendingOperation.sourcePaneId === 'left' ? 'leftPane' : 'rightPane']: {
            cursorEntryId: renameResult.entryId,
            selectedIds: [],
            selectionAnchorEntryId: renameResult.entryId,
          },
        }),
      }
    }

    if (pendingOperation.kind === 'select' || pendingOperation.kind === 'unselect') {
      const mask = pendingOperation.inputValue?.trim() ?? ''
      const selectionMode: 'select' | 'unselect' = pendingOperation.kind

      return {
        ...widgets,
        [payload.widgetId]: updatePaneState(
          {
            ...widgetState,
            pendingOperation: null,
          },
          pendingOperation.sourcePaneId,
          (paneState) => applySelectionMaskToPane(paneState, mask, selectionMode),
        ),
      }
    }

    if (pendingOperation.kind === 'filter') {
      const filterQuery = pendingOperation.inputValue?.trim() ?? ''

      return {
        ...widgets,
        [payload.widgetId]: updatePaneState(
          {
            ...widgetState,
            pendingOperation: null,
          },
          pendingOperation.sourcePaneId,
          (paneState) => rebuildPaneState(widgetState, {
            ...paneState,
            filterQuery,
          }),
        ),
      }
    }

    if (pendingOperation.kind === 'search') {
      const sourcePane = getPaneState(widgetState, pendingOperation.sourcePaneId)
      const matches = getCommanderSearchMatches(
        sourcePane,
        pendingOperation.inputValue ?? '',
      )
      const resolvedMatchIndex = getCommanderResolvedSearchMatchIndex(
        matches.entryIds,
        sourcePane.cursorEntryId,
        pendingOperation.matchIndex ?? 0,
      )
      const nextCursorEntryId = resolvedMatchIndex === -1
        ? null
        : (matches.entryIds[resolvedMatchIndex] ?? null)

      return {
        ...widgets,
        [payload.widgetId]: updatePaneState(
          {
            ...widgetState,
            pendingOperation: null,
          },
          pendingOperation.sourcePaneId,
          (paneState) => (
            nextCursorEntryId
              ? {
                ...paneState,
                cursorEntryId: nextCursorEntryId,
                selectionAnchorEntryId: nextCursorEntryId,
              }
              : paneState
          ),
        ),
      }
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        pendingOperation: null,
      },
    }
  })
  .on(resolveCommanderPendingConflict, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState?.pendingOperation) {
      return widgets
    }

    const pendingOperation = widgetState.pendingOperation

    if ((pendingOperation.kind !== 'copy' && pendingOperation.kind !== 'move') || !pendingOperation.targetPath) {
      return widgets
    }

    const currentConflictName = getCurrentPendingConflictName(pendingOperation)

    if (!currentConflictName && payload.resolution !== 'overwrite-all' && payload.resolution !== 'skip-all') {
      return widgets
    }

    if (payload.resolution === 'overwrite-all') {
      applyPendingTransferOperation(payload.widgetId, pendingOperation, pendingOperation.entryIds, true)

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (payload.resolution === 'skip-all') {
      const conflictEntryNameSet = new Set(pendingOperation.conflictEntryNames ?? [])
      const nonConflictingEntryIds = pendingOperation.entryIds.filter((_entryId, index) => (
        !conflictEntryNameSet.has(pendingOperation.entryNames[index] ?? '')
      ))

      applyPendingTransferOperation(payload.widgetId, pendingOperation, nonConflictingEntryIds, false)

      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: null,
        }),
      }
    }

    if (!currentConflictName) {
      return widgets
    }

    const currentConflictIndex = pendingOperation.entryNames.findIndex((entryName) => entryName === currentConflictName)
    const currentConflictEntryId = currentConflictIndex === -1
      ? null
      : (pendingOperation.entryIds[currentConflictIndex] ?? null)

    if (payload.resolution === 'overwrite-current' && currentConflictEntryId) {
      applyPendingTransferOperation(payload.widgetId, pendingOperation, [currentConflictEntryId], true)
    }

    const nextPendingOperation = removePendingTransferEntry(pendingOperation, currentConflictName)

    if (nextPendingOperation.conflictEntryNames?.length) {
      return {
        ...widgets,
        [payload.widgetId]: refreshWidgetPanes(widgetState, {
          pendingOperation: nextPendingOperation,
        }),
      }
    }

    return {
      ...widgets,
      [payload.widgetId]: finalizePendingTransferOperation(widgetState, payload.widgetId, nextPendingOperation),
    }
  })
  .on(cancelCommanderPendingOperation, (widgets, payload) => {
    const widgetState = widgets[payload.widgetId]

    if (!widgetState || !widgetState.pendingOperation) {
      return widgets
    }

    return {
      ...widgets,
      [payload.widgetId]: {
        ...widgetState,
        pendingOperation: null,
      },
    }
  })

attachCommanderWidgetsPersistence($commanderWidgets)
