import { createEvent, createStore } from 'effector'

import {
  createCommanderWidgetRuntimeState,
  getCommanderParentPath,
  hydrateCommanderClient,
  openCommanderEntry,
  writeCommanderFile,
} from '@/features/commander/model/fake-client'
import { attachCommanderWidgetsPersistence } from '@/features/commander/model/store-persistence'
import {
  confirmCommanderWidgetPendingOperation,
  createCommanderFileDialog,
  createPendingOperation,
  requestCommanderWidgetPendingOperation,
  resolveCommanderWidgetPendingConflict,
  stepCommanderWidgetPendingSearchMatch,
  updateCommanderPendingOperationInput,
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
import { withCommanderWidgetState } from '@/features/commander/model/store-widget-state'
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
export const moveCommanderActivePaneCursor = createEvent<
  CommanderWidgetPayload & { delta: number; extendSelection?: boolean }
>()
export const toggleCommanderPaneSelection = createEvent<CommanderToggleEntrySelectionPayload>()
export const toggleCommanderActivePaneSelection = createEvent<
  CommanderWidgetPayload & { advance?: boolean }
>()
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
    return withCommanderWidgetState(widgets, payload, (widgetState) => ({
      ...widgetState,
      activePane: payload.paneId,
    }))
  })
  .on(toggleCommanderShowHidden, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const nextWidgetState = {
        ...widgetState,
        showHidden: !widgetState.showHidden,
      }

      return {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      }
    })
  })
  .on(toggleCommanderDirsFirst, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const nextWidgetState = {
        ...widgetState,
        dirsFirst: !widgetState.dirsFirst,
      }

      return {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      }
    })
  })
  .on(setCommanderViewMode, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      if (widgetState.viewMode === payload.viewMode) {
        return null
      }

      return {
        ...widgetState,
        viewMode: payload.viewMode,
      }
    })
  })
  .on(setCommanderSortMode, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const nextSortDirection: CommanderSortDirection =
        widgetState.sortMode === payload.sortMode
          ? widgetState.sortDirection === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc'
      const nextWidgetState = {
        ...widgetState,
        sortMode: payload.sortMode,
        sortDirection: nextSortDirection,
      }

      return {
        ...nextWidgetState,
        leftPane: rebuildPaneState(nextWidgetState, widgetState.leftPane),
        rightPane: rebuildPaneState(nextWidgetState, widgetState.rightPane),
      }
    })
  })
  .on(setCommanderPaneCursor, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(
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
    )
  })
  .on(moveCommanderPaneCursor, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) =>
          payload.extendSelection
            ? movePaneCursorWithSelection(paneState, payload.delta)
            : movePaneCursor(paneState, payload.delta),
      ),
    )
  })
  .on(moveCommanderActivePaneCursor, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(widgetState, widgetState.activePane, (paneState) =>
        payload.extendSelection
          ? movePaneCursorWithSelection(paneState, payload.delta)
          : movePaneCursor(paneState, payload.delta),
      ),
    )
  })
  .on(toggleCommanderPaneSelection, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) => toggleEntrySelection(paneState, payload.entryId),
      ),
    )
  })
  .on(toggleCommanderActivePaneSelection, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const activePaneState = getPaneState(widgetState, widgetState.activePane)
      const entryId = activePaneState.cursorEntryId

      if (!entryId) {
        return null
      }

      let nextWidgetState = updatePaneState(widgetState, widgetState.activePane, (paneState) =>
        toggleEntrySelection(paneState, entryId),
      )

      if (payload.advance) {
        nextWidgetState = updatePaneState(nextWidgetState, widgetState.activePane, (paneState) =>
          movePaneCursor(paneState, 1),
        )
      }

      return nextWidgetState
    })
  })
  .on(requestCommanderActivePaneView, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      if (widgetState.pendingOperation) {
        return null
      }

      const fileDialog = createCommanderFileDialog(widgetState, widgetState.activePane, 'view')

      if (!fileDialog) {
        return null
      }

      return {
        ...widgetState,
        fileDialog,
      }
    })
  })
  .on(requestCommanderActivePaneEdit, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      if (widgetState.pendingOperation) {
        return null
      }

      const fileDialog = createCommanderFileDialog(widgetState, widgetState.activePane, 'edit')

      if (!fileDialog) {
        return null
      }

      return {
        ...widgetState,
        fileDialog,
      }
    })
  })
  .on(setCommanderFileDialogDraft, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      if (!widgetState.fileDialog) {
        return null
      }

      return {
        ...widgetState,
        fileDialog: {
          ...widgetState.fileDialog,
          draftValue: payload.inputValue,
        },
      }
    })
  })
  .on(saveCommanderFileDialog, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const fileDialog = widgetState.fileDialog

      if (!fileDialog || fileDialog.mode !== 'edit') {
        return null
      }

      const didSave = writeCommanderFile({
        widgetId: payload.widgetId,
        path: fileDialog.path,
        entryId: fileDialog.entryId,
        content: fileDialog.draftValue,
      })

      if (!didSave) {
        return null
      }

      return refreshWidgetPanes(widgetState, {
        fileDialog: null,
      })
    })
  })
  .on(closeCommanderFileDialog, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      if (!widgetState.fileDialog) {
        return null
      }

      return {
        ...widgetState,
        fileDialog: null,
      }
    })
  })
  .on(openCommanderPaneEntry, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const navigationResult = openCommanderEntry(
        payload.widgetId,
        getPaneState(widgetState, payload.paneId).path,
        payload.entryId,
      )

      if (!navigationResult || navigationResult.kind !== 'directory') {
        return null
      }

      return navigatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        navigationResult.path,
      )
    })
  })
  .on(openCommanderActivePaneEntry, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const activePaneState = getPaneState(widgetState, widgetState.activePane)
      const entryId = activePaneState.cursorEntryId

      if (!entryId) {
        return null
      }

      const navigationResult = openCommanderEntry(payload.widgetId, activePaneState.path, entryId)

      if (!navigationResult || navigationResult.kind !== 'directory') {
        return null
      }

      return navigatePaneState(widgetState, widgetState.activePane, navigationResult.path)
    })
  })
  .on(goCommanderPaneParent, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const paneState = getPaneState(widgetState, payload.paneId)
      const parentPath = getCommanderParentPath(paneState.path)

      if (!parentPath) {
        return null
      }

      return navigatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        parentPath,
      )
    })
  })
  .on(goCommanderActivePaneParent, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const paneState = getPaneState(widgetState, widgetState.activePane)
      const parentPath = getCommanderParentPath(paneState.path)

      if (!parentPath) {
        return null
      }

      return navigatePaneState(widgetState, widgetState.activePane, parentPath)
    })
  })
  .on(goCommanderPaneHistoryBack, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      navigatePaneHistory(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        'back',
      ),
    )
  })
  .on(goCommanderPaneHistoryForward, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      navigatePaneHistory(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        'forward',
      ),
    )
  })
  .on(goCommanderActivePaneHistoryBack, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      navigatePaneHistory(widgetState, widgetState.activePane, 'back'),
    )
  })
  .on(goCommanderActivePaneHistoryForward, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      navigatePaneHistory(widgetState, widgetState.activePane, 'forward'),
    )
  })
  .on(switchCommanderActivePane, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => ({
      ...widgetState,
      activePane: widgetState.activePane === 'left' ? 'right' : 'left',
    }))
  })
  .on(setCommanderPaneBoundaryCursor, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(
        {
          ...widgetState,
          activePane: payload.paneId,
        },
        payload.paneId,
        (paneState) =>
          payload.extendSelection
            ? setCursorToBoundaryWithSelection(paneState, payload.boundary)
            : setCursorToBoundary(paneState, payload.boundary),
      ),
    )
  })
  .on(requestCommanderActivePaneCopy, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'copy'),
    )
  })
  .on(requestCommanderActivePaneMove, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'move'),
    )
  })
  .on(requestCommanderActivePaneDelete, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'delete'),
    )
  })
  .on(requestCommanderActivePaneMkdir, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'mkdir'),
    )
  })
  .on(requestCommanderActivePaneRename, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'rename'),
    )
  })
  .on(requestCommanderActivePaneSelectByMask, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'select'),
    )
  })
  .on(requestCommanderActivePaneUnselectByMask, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'unselect'),
    )
  })
  .on(requestCommanderActivePaneFilter, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'filter'),
    )
  })
  .on(requestCommanderActivePaneSearch, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      requestCommanderWidgetPendingOperation(widgetState, 'search'),
    )
  })
  .on(stepCommanderPendingSearchMatch, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      stepCommanderWidgetPendingSearchMatch(widgetState, payload.delta),
    )
  })
  .on(clearCommanderActivePaneFilter, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(widgetState, widgetState.activePane, (paneState) =>
        rebuildPaneState(widgetState, {
          ...paneState,
          filterQuery: '',
        }),
      ),
    )
  })
  .on(setCommanderPanePath, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const nextPath = payload.path.trim()

      if (!nextPath) {
        return null
      }

      const currentPaneState = getPaneState(widgetState, payload.paneId)

      if (currentPaneState.path === nextPath) {
        return null
      }

      return navigatePaneState(widgetState, payload.paneId, nextPath)
    })
  })
  .on(invertCommanderActivePaneSelection, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(widgetState, widgetState.activePane, invertPaneSelection),
    )
  })
  .on(setCommanderPendingOperationInput, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updateCommanderPendingOperationInput(widgetState, payload.widgetId, payload.inputValue),
    )
  })
  .on(confirmCommanderPendingOperation, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      confirmCommanderWidgetPendingOperation(widgetState, payload.widgetId),
    )
  })
  .on(resolveCommanderPendingConflict, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      resolveCommanderWidgetPendingConflict(widgetState, payload.widgetId, payload.resolution),
    )
  })
  .on(cancelCommanderPendingOperation, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      if (!widgetState.pendingOperation) {
        return null
      }

      return {
        ...widgetState,
        pendingOperation: null,
      }
    })
  })

attachCommanderWidgetsPersistence($commanderWidgets)
