import { createEvent, createStore } from 'effector'

import {
  createCommanderWidgetRuntimeState,
  rebuildCommanderPaneState,
} from '@/features/commander/model/pane-state'
import { attachCommanderWidgetsPersistence } from '@/features/commander/model/store-persistence'
import {
  confirmCommanderWidgetPendingOperation,
  requestCommanderWidgetPendingOperation,
  stepCommanderWidgetPendingSearchMatch,
  updateCommanderPendingOperationInput,
} from '@/features/commander/model/store-operations'
import { getPaneState, rebuildPaneState, updatePaneState } from '@/features/commander/model/store-navigation'
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
  CommanderPendingOperation,
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

type CommanderSetPendingOperationPayload = CommanderWidgetPayload & {
  pendingOperation: CommanderPendingOperation | null
}

type CommanderSetPanePathPayload = CommanderWidgetPanePayload & {
  path: string
}

type CommanderSetPaneFilterQueryPayload = CommanderWidgetPanePayload & {
  filterQuery: string
}

type CommanderResolvePendingConflictPayload = CommanderWidgetPayload & {
  resolution: 'overwrite-current' | 'skip-current' | 'overwrite-all' | 'skip-all'
}

type CommanderOpenEntryPayload = CommanderWidgetPanePayload & {
  entryId: string
}

type CommanderHydratePanePayload = CommanderWidgetPanePayload & {
  directoryEntries: CommanderWidgetRuntimeState['leftPane']['directoryEntries']
  cursorEntryId?: string | null
  filterQuery?: string
  historyMode?: 'back' | 'forward' | 'push' | 'replace'
  path: string
  selectedIds?: string[]
  selectionAnchorEntryId?: string | null
}

type CommanderPaneStatusPayload = CommanderWidgetPanePayload & {
  errorMessage?: string | null
  path?: string
}

type CommanderSetFileDialogPayload = CommanderWidgetPayload & {
  fileDialog: CommanderWidgetRuntimeState['fileDialog']
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
export const setCommanderPaneFilterQuery = createEvent<CommanderSetPaneFilterQueryPayload>()
export const setCommanderPendingOperationInput = createEvent<CommanderSetPendingOperationInputPayload>()
export const setCommanderPendingOperation = createEvent<CommanderSetPendingOperationPayload>()
export const setCommanderFileDialogDraft = createEvent<CommanderSetPendingOperationInputPayload>()
export const setCommanderFileDialog = createEvent<CommanderSetFileDialogPayload>()
export const hydrateCommanderPaneDirectory = createEvent<CommanderHydratePanePayload>()
export const setCommanderPaneLoadError = createEvent<CommanderPaneStatusPayload>()
export const setCommanderPaneLoading = createEvent<CommanderPaneStatusPayload>()
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
  .on(setCommanderPaneLoading, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(widgetState, payload.paneId, (paneState) => ({
        ...paneState,
        isLoading: true,
        errorMessage: null,
      })),
    )
  })
  .on(setCommanderPaneLoadError, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(widgetState, payload.paneId, (paneState) => {
        const nextPath = payload.path ?? paneState.path
        const pathChanged = nextPath !== paneState.path

        return rebuildCommanderPaneState(widgetState, paneState, {
          path: nextPath,
          directoryEntries: pathChanged ? [] : paneState.directoryEntries,
          selectedIds: pathChanged ? [] : paneState.selectedIds,
          cursorEntryId: pathChanged ? null : paneState.cursorEntryId,
          selectionAnchorEntryId: pathChanged ? null : paneState.selectionAnchorEntryId,
          isLoading: false,
          errorMessage: payload.errorMessage ?? 'Unable to load directory',
        })
      }),
    )
  })
  .on(hydrateCommanderPaneDirectory, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => {
      const currentPaneState = getPaneState(widgetState, payload.paneId)
      const pathChanged = currentPaneState.path !== payload.path
      const nextHistoryBack =
        payload.historyMode === 'push' && currentPaneState.path
          ? [...currentPaneState.historyBack, currentPaneState.path]
          : payload.historyMode === 'forward' && currentPaneState.path
            ? [...currentPaneState.historyBack, currentPaneState.path]
            : payload.historyMode === 'back'
              ? currentPaneState.historyBack.slice(0, -1)
              : currentPaneState.historyBack
      const nextHistoryForward =
        payload.historyMode === 'push'
          ? []
          : payload.historyMode === 'back' && currentPaneState.path
            ? [...currentPaneState.historyForward, currentPaneState.path]
            : payload.historyMode === 'forward'
              ? currentPaneState.historyForward.slice(0, -1)
              : currentPaneState.historyForward
      const nextWidgetState = {
        ...widgetState,
        activePane: payload.paneId,
      }
      const hasCursorOverride = Object.prototype.hasOwnProperty.call(payload, 'cursorEntryId')
      const hasSelectedIdsOverride = Object.prototype.hasOwnProperty.call(payload, 'selectedIds')
      const hasSelectionAnchorOverride = Object.prototype.hasOwnProperty.call(
        payload,
        'selectionAnchorEntryId',
      )

      return updatePaneState(nextWidgetState, payload.paneId, (paneState) =>
        rebuildCommanderPaneState(nextWidgetState, paneState, {
          path: payload.path,
          filterQuery: payload.filterQuery ?? (pathChanged ? '' : paneState.filterQuery),
          directoryEntries: payload.directoryEntries,
          selectedIds: hasSelectedIdsOverride
            ? (payload.selectedIds ?? [])
            : pathChanged
              ? []
              : paneState.selectedIds,
          cursorEntryId: hasCursorOverride
            ? (payload.cursorEntryId ?? null)
            : pathChanged
              ? null
              : paneState.cursorEntryId,
          selectionAnchorEntryId: hasSelectionAnchorOverride
            ? (payload.selectionAnchorEntryId ?? null)
            : pathChanged
              ? null
              : paneState.selectionAnchorEntryId,
          historyBack: nextHistoryBack,
          historyForward: nextHistoryForward,
          isLoading: false,
          errorMessage: null,
        }),
      )
    })
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
  .on(setCommanderFileDialog, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => ({
      ...widgetState,
      fileDialog: payload.fileDialog,
    }))
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
  .on(setCommanderPaneFilterQuery, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      updatePaneState(widgetState, payload.paneId, (paneState) =>
        rebuildPaneState(widgetState, {
          ...paneState,
          filterQuery: payload.filterQuery,
        }),
      ),
    )
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
  .on(setCommanderPendingOperation, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) => ({
      ...widgetState,
      pendingOperation: payload.pendingOperation,
    }))
  })
  .on(confirmCommanderPendingOperation, (widgets, payload) => {
    return withCommanderWidgetState(widgets, payload, (widgetState) =>
      confirmCommanderWidgetPendingOperation(widgetState, payload.widgetId),
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
