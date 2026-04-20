import { useUnit } from 'effector-react'
import { useEffect, useMemo } from 'react'

import { getCommanderSelectedSize, createCommanderWidgetRuntimeState } from './fake-client'
import {
  $commanderWidgets,
  cancelCommanderPendingOperation,
  confirmCommanderPendingOperation,
  goCommanderActivePaneParent,
  goCommanderPaneParent,
  mountCommanderWidget,
  moveCommanderActivePaneCursor,
  openCommanderActivePaneEntry,
  openCommanderPaneEntry,
  requestCommanderActivePaneCopy,
  requestCommanderActivePaneDelete,
  requestCommanderActivePaneMkdir,
  requestCommanderActivePaneMove,
  setCommanderActivePane,
  setCommanderPaneBoundaryCursor,
  setCommanderPaneCursor,
  setCommanderViewMode,
  switchCommanderActivePane,
  toggleCommanderActivePaneSelection,
  toggleCommanderPaneSelection,
  toggleCommanderShowHidden,
} from './store'
import type {
  CommanderPaneId,
  CommanderPaneRuntimeState,
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
    footerHints: widgetState.footerHints,
    pendingOperation: widgetState.pendingOperation,
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

  useEffect(() => {
    onMountCommanderWidget(widgetId)
  }, [onMountCommanderWidget, widgetId])

  const runtimeState = commanderWidgets[widgetId] ?? createCommanderWidgetRuntimeState(widgetId)
  const viewState = useMemo(() => toWidgetViewState(runtimeState), [runtimeState])

  return {
    state: viewState,
    runtimeState,
    actions: {
      openPaneEntry: (paneId: CommanderPaneId, entryId: string) => onOpenCommanderPaneEntry({ widgetId, paneId, entryId }),
      setActivePane: (paneId: CommanderPaneId) => onSetCommanderActivePane({ widgetId, paneId }),
      setPaneCursor: (paneId: CommanderPaneId, entryId: string) => onSetCommanderPaneCursor({ widgetId, paneId, entryId }),
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
    setCursor: (entryId: string) => commander.actions.setPaneCursor(paneId, entryId),
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
    onConfirmCommanderPendingOperation,
    onCancelCommanderPendingOperation,
    onGoCommanderActivePaneParent,
    onSwitchCommanderActivePane,
    onSetCommanderPaneBoundaryCursor,
    onGoCommanderPaneParent,
  ] = useUnit([
    moveCommanderActivePaneCursor,
    openCommanderActivePaneEntry,
    toggleCommanderActivePaneSelection,
    requestCommanderActivePaneCopy,
    requestCommanderActivePaneMove,
    requestCommanderActivePaneDelete,
    requestCommanderActivePaneMkdir,
    confirmCommanderPendingOperation,
    cancelCommanderPendingOperation,
    goCommanderActivePaneParent,
    switchCommanderActivePane,
    setCommanderPaneBoundaryCursor,
    goCommanderPaneParent,
  ])

  return {
    cancelPendingOperation: () => onCancelCommanderPendingOperation({ widgetId }),
    confirmPendingOperation: () => onConfirmCommanderPendingOperation({ widgetId }),
    copySelection: () => onRequestCommanderActivePaneCopy({ widgetId }),
    deleteSelection: () => onRequestCommanderActivePaneDelete({ widgetId }),
    goPaneParent: (paneId: CommanderPaneId) => onGoCommanderPaneParent({ widgetId, paneId }),
    goParent: () => onGoCommanderActivePaneParent({ widgetId }),
    mkdir: () => onRequestCommanderActivePaneMkdir({ widgetId }),
    moveSelection: () => onRequestCommanderActivePaneMove({ widgetId }),
    moveCursor: (delta: number) => onMoveCommanderActivePaneCursor({ widgetId, delta }),
    openActiveEntry: () => onOpenCommanderActivePaneEntry({ widgetId }),
    setBoundaryCursor: (paneId: CommanderPaneId, boundary: 'start' | 'end') => (
      onSetCommanderPaneBoundaryCursor({ widgetId, paneId, boundary })
    ),
    switchActivePane: () => onSwitchCommanderActivePane({ widgetId }),
    toggleSelectionAtCursor: (advance?: boolean) => onToggleCommanderActivePaneSelection({ widgetId, advance }),
  }
}
