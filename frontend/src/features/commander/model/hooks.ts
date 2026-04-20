import { useUnit } from 'effector-react'
import { useEffect, useMemo } from 'react'

import { getCommanderSelectedSize, createCommanderWidgetRuntimeState } from './fake-client'
import { readPersistedCommanderWidget } from './persistence'
import {
  $commanderWidgets,
  cancelCommanderPendingOperation,
  confirmCommanderPendingOperation,
  goCommanderActivePaneParent,
  goCommanderActivePaneHistoryBack,
  goCommanderActivePaneHistoryForward,
  goCommanderPaneHistoryBack,
  goCommanderPaneHistoryForward,
  goCommanderPaneParent,
  mountCommanderWidget,
  moveCommanderActivePaneCursor,
  openCommanderActivePaneEntry,
  openCommanderPaneEntry,
  requestCommanderActivePaneCopy,
  requestCommanderActivePaneDelete,
  requestCommanderActivePaneMkdir,
  requestCommanderActivePaneMove,
  requestCommanderActivePaneRename,
  requestCommanderActivePaneSelectByMask,
  requestCommanderActivePaneUnselectByMask,
  requestCommanderActivePaneFilter,
  requestCommanderActivePaneSearch,
  stepCommanderPendingSearchMatch,
  requestCommanderActivePaneView,
  requestCommanderActivePaneEdit,
  toggleCommanderDirsFirst,
  resolveCommanderPendingConflict,
  setCommanderActivePane,
  setCommanderFileDialogDraft,
  setCommanderPanePath,
  setCommanderSortMode,
  setCommanderPaneBoundaryCursor,
  setCommanderPaneCursor,
  setCommanderPendingOperationInput,
  saveCommanderFileDialog,
  setCommanderViewMode,
  switchCommanderActivePane,
  toggleCommanderActivePaneSelection,
  toggleCommanderPaneSelection,
  toggleCommanderShowHidden,
  invertCommanderActivePaneSelection,
  clearCommanderActivePaneFilter,
  closeCommanderFileDialog,
} from './store'
import type {
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderSortMode,
  CommanderPaneViewState,
  CommanderWidgetRuntimeState,
  CommanderWidgetViewState,
  CommanderViewMode,
} from './types'

function toPaneViewState(
  widgetState: CommanderWidgetRuntimeState,
  paneState: CommanderPaneRuntimeState,
): CommanderPaneViewState {
  return {
    id: paneState.id,
    path: paneState.path,
    filterQuery: paneState.filterQuery,
    canGoBack: paneState.historyBack.length > 0,
    canGoForward: paneState.historyForward.length > 0,
    counters: {
      items: paneState.entries.length,
      selectedItems: paneState.selectedIds.length,
      selectedSize: getCommanderSelectedSize(paneState.entries, paneState.selectedIds),
    },
    rows: paneState.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      ext: entry.ext,
      kind: entry.kind,
      size: entry.sizeLabel,
      modified: entry.modified,
      hidden: entry.hidden,
      selected: paneState.selectedIds.includes(entry.id),
      focused: widgetState.activePane === paneState.id && paneState.cursorEntryId === entry.id,
      gitStatus: entry.gitStatus,
      executable: entry.executable,
      symlinkTarget: entry.symlinkTarget,
    })),
  }
}

function toWidgetViewState(widgetState: CommanderWidgetRuntimeState): CommanderWidgetViewState {
  return {
    mode: 'commander',
    viewMode: widgetState.viewMode,
    activePane: widgetState.activePane,
    showHidden: widgetState.showHidden,
    syncCwd: false,
    sortMode: widgetState.sortMode,
    sortDirection: widgetState.sortDirection,
    dirsFirst: widgetState.dirsFirst,
    footerHints: widgetState.footerHints,
    pendingOperation: widgetState.pendingOperation,
    fileDialog: widgetState.fileDialog,
    leftPane: toPaneViewState(widgetState, widgetState.leftPane),
    rightPane: toPaneViewState(widgetState, widgetState.rightPane),
  }
}

export function useCommanderWidget(widgetId: string) {
  const [
    commanderWidgets,
    onMountCommanderWidget,
    onSetCommanderActivePane,
    onToggleCommanderShowHidden,
    onSetCommanderViewMode,
    onSetCommanderPaneCursor,
    onOpenCommanderPaneEntry,
    onToggleCommanderPaneSelection,
  ] = useUnit([
    $commanderWidgets,
    mountCommanderWidget,
    setCommanderActivePane,
    toggleCommanderShowHidden,
    setCommanderViewMode,
    setCommanderPaneCursor,
    openCommanderPaneEntry,
    toggleCommanderPaneSelection,
  ])

  const persistedWidget = useMemo(
    () => readPersistedCommanderWidget(widgetId),
    [widgetId],
  )
  const bootstrapRuntimeState = useMemo(
    () => createCommanderWidgetRuntimeState(widgetId, persistedWidget?.runtime),
    [persistedWidget, widgetId],
  )

  useEffect(() => {
    onMountCommanderWidget({
      widgetId,
      persistedWidget,
    })
  }, [onMountCommanderWidget, persistedWidget, widgetId])

  const runtimeState = commanderWidgets[widgetId] ?? bootstrapRuntimeState
  const viewState = useMemo(() => toWidgetViewState(runtimeState), [runtimeState])

  return {
    state: viewState,
    runtimeState,
    actions: {
      openPaneEntry: (paneId: CommanderPaneId, entryId: string) => onOpenCommanderPaneEntry({ widgetId, paneId, entryId }),
      setActivePane: (paneId: CommanderPaneId) => onSetCommanderActivePane({ widgetId, paneId }),
      setPaneCursor: (paneId: CommanderPaneId, entryId: string, options?: { rangeSelect?: boolean }) => (
        onSetCommanderPaneCursor({ widgetId, paneId, entryId, rangeSelect: options?.rangeSelect })
      ),
      setViewMode: (viewMode: CommanderViewMode) => onSetCommanderViewMode({ widgetId, viewMode }),
      togglePaneSelection: (paneId: CommanderPaneId, entryId: string) => onToggleCommanderPaneSelection({ widgetId, paneId, entryId }),
      toggleShowHidden: () => onToggleCommanderShowHidden({ widgetId }),
    },
  }
}

export function useCommanderPane(widgetId: string, paneId: CommanderPaneId) {
  const commander = useCommanderWidget(widgetId)
  const paneState = paneId === 'left' ? commander.state.leftPane : commander.state.rightPane

  return {
    pane: paneState,
    isActive: commander.state.activePane === paneId,
    setActive: () => commander.actions.setActivePane(paneId),
    setCursor: (entryId: string, options?: { rangeSelect?: boolean }) => commander.actions.setPaneCursor(paneId, entryId, options),
    openEntry: (entryId: string) => commander.actions.openPaneEntry(paneId, entryId),
    toggleSelection: (entryId: string) => commander.actions.togglePaneSelection(paneId, entryId),
  }
}

export function useCommanderActions(widgetId: string) {
  const [
    onMoveCommanderActivePaneCursor,
    onOpenCommanderActivePaneEntry,
    onToggleCommanderActivePaneSelection,
    onRequestCommanderActivePaneCopy,
    onRequestCommanderActivePaneMove,
    onRequestCommanderActivePaneDelete,
    onRequestCommanderActivePaneMkdir,
    onRequestCommanderActivePaneRename,
    onRequestCommanderActivePaneSelectByMask,
    onRequestCommanderActivePaneUnselectByMask,
    onRequestCommanderActivePaneFilter,
    onRequestCommanderActivePaneSearch,
    onStepCommanderPendingSearchMatch,
    onRequestCommanderActivePaneView,
    onRequestCommanderActivePaneEdit,
    onToggleCommanderDirsFirst,
    onConfirmCommanderPendingOperation,
    onCancelCommanderPendingOperation,
    onResolveCommanderPendingConflict,
    onSetCommanderFileDialogDraft,
    onSaveCommanderFileDialog,
    onCloseCommanderFileDialog,
    onGoCommanderActivePaneParent,
    onGoCommanderActivePaneHistoryBack,
    onGoCommanderActivePaneHistoryForward,
    onGoCommanderPaneHistoryBack,
    onGoCommanderPaneHistoryForward,
    onSwitchCommanderActivePane,
    onSetCommanderPaneCursor,
    onSetCommanderPaneBoundaryCursor,
    onSetCommanderPanePath,
    onSetCommanderSortMode,
    onGoCommanderPaneParent,
    onSetCommanderPendingOperationInput,
    onInvertCommanderActivePaneSelection,
    onClearCommanderActivePaneFilter,
  ] = useUnit([
    moveCommanderActivePaneCursor,
    openCommanderActivePaneEntry,
    toggleCommanderActivePaneSelection,
    requestCommanderActivePaneCopy,
    requestCommanderActivePaneMove,
    requestCommanderActivePaneDelete,
    requestCommanderActivePaneMkdir,
    requestCommanderActivePaneRename,
    requestCommanderActivePaneSelectByMask,
    requestCommanderActivePaneUnselectByMask,
    requestCommanderActivePaneFilter,
    requestCommanderActivePaneSearch,
    stepCommanderPendingSearchMatch,
    requestCommanderActivePaneView,
    requestCommanderActivePaneEdit,
    toggleCommanderDirsFirst,
    confirmCommanderPendingOperation,
    cancelCommanderPendingOperation,
    resolveCommanderPendingConflict,
    setCommanderFileDialogDraft,
    saveCommanderFileDialog,
    closeCommanderFileDialog,
    goCommanderActivePaneParent,
    goCommanderActivePaneHistoryBack,
    goCommanderActivePaneHistoryForward,
    goCommanderPaneHistoryBack,
    goCommanderPaneHistoryForward,
    switchCommanderActivePane,
    setCommanderPaneCursor,
    setCommanderPaneBoundaryCursor,
    setCommanderPanePath,
    setCommanderSortMode,
    goCommanderPaneParent,
    setCommanderPendingOperationInput,
    invertCommanderActivePaneSelection,
    clearCommanderActivePaneFilter,
  ])

  return {
    cancelPendingOperation: () => onCancelCommanderPendingOperation({ widgetId }),
    confirmPendingOperation: () => onConfirmCommanderPendingOperation({ widgetId }),
    copySelection: () => onRequestCommanderActivePaneCopy({ widgetId }),
    deleteSelection: () => onRequestCommanderActivePaneDelete({ widgetId }),
    goBack: () => onGoCommanderActivePaneHistoryBack({ widgetId }),
    goForward: () => onGoCommanderActivePaneHistoryForward({ widgetId }),
    goPaneBack: (paneId: CommanderPaneId) => onGoCommanderPaneHistoryBack({ widgetId, paneId }),
    goPaneForward: (paneId: CommanderPaneId) => onGoCommanderPaneHistoryForward({ widgetId, paneId }),
    goPaneParent: (paneId: CommanderPaneId) => onGoCommanderPaneParent({ widgetId, paneId }),
    goParent: () => onGoCommanderActivePaneParent({ widgetId }),
    mkdir: () => onRequestCommanderActivePaneMkdir({ widgetId }),
    moveSelection: () => onRequestCommanderActivePaneMove({ widgetId }),
    selectByMask: () => onRequestCommanderActivePaneSelectByMask({ widgetId }),
    unselectByMask: () => onRequestCommanderActivePaneUnselectByMask({ widgetId }),
    filterActivePane: () => onRequestCommanderActivePaneFilter({ widgetId }),
    searchActivePane: () => onRequestCommanderActivePaneSearch({ widgetId }),
    stepSearchMatch: (delta: 1 | -1) => onStepCommanderPendingSearchMatch({ widgetId, delta }),
    toggleDirsFirst: () => onToggleCommanderDirsFirst({ widgetId }),
    viewActiveFile: () => onRequestCommanderActivePaneView({ widgetId }),
    editActiveFile: () => onRequestCommanderActivePaneEdit({ widgetId }),
    setFileDialogDraft: (inputValue: string) => onSetCommanderFileDialogDraft({ widgetId, inputValue }),
    saveFileDialog: () => onSaveCommanderFileDialog({ widgetId }),
    closeFileDialog: () => onCloseCommanderFileDialog({ widgetId }),
    clearActivePaneFilter: () => onClearCommanderActivePaneFilter({ widgetId }),
    invertSelection: () => onInvertCommanderActivePaneSelection({ widgetId }),
    moveCursor: (delta: number, options?: { extendSelection?: boolean }) => (
      onMoveCommanderActivePaneCursor({ widgetId, delta, extendSelection: options?.extendSelection })
    ),
    openActiveEntry: () => onOpenCommanderActivePaneEntry({ widgetId }),
    renameSelection: () => onRequestCommanderActivePaneRename({ widgetId }),
    overwritePendingConflict: () => onResolveCommanderPendingConflict({ widgetId, resolution: 'overwrite-current' }),
    skipPendingConflict: () => onResolveCommanderPendingConflict({ widgetId, resolution: 'skip-current' }),
    overwriteAllPendingConflicts: () => onResolveCommanderPendingConflict({ widgetId, resolution: 'overwrite-all' }),
    skipAllPendingConflicts: () => onResolveCommanderPendingConflict({ widgetId, resolution: 'skip-all' }),
    setCursor: (paneId: CommanderPaneId, entryId: string, options?: { rangeSelect?: boolean }) => (
      onSetCommanderPaneCursor({ widgetId, paneId, entryId, rangeSelect: options?.rangeSelect })
    ),
    setSortMode: (sortMode: CommanderSortMode) => onSetCommanderSortMode({ widgetId, sortMode }),
    setBoundaryCursor: (paneId: CommanderPaneId, boundary: 'start' | 'end', options?: { extendSelection?: boolean }) => (
      onSetCommanderPaneBoundaryCursor({ widgetId, paneId, boundary, extendSelection: options?.extendSelection })
    ),
    setPanePath: (paneId: CommanderPaneId, path: string) => onSetCommanderPanePath({ widgetId, paneId, path }),
    setPendingOperationInput: (inputValue: string) => onSetCommanderPendingOperationInput({ widgetId, inputValue }),
    switchActivePane: () => onSwitchCommanderActivePane({ widgetId }),
    toggleSelectionAtCursor: (advance?: boolean) => onToggleCommanderActivePaneSelection({ widgetId, advance }),
  }
}
