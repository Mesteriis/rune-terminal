import { useCallback, useRef, type KeyboardEvent } from 'react'

import {
  handleCommanderAltNavigationKeys,
  handleCommanderTypeaheadKey,
  handleCommanderFileDialogKeys,
  handleCommanderModifierKeys,
  handleCommanderNavigationKeys,
  handleCommanderPendingOperationKeys,
  handleCommanderSelectionShortcutKeys,
  handleCommanderShiftNavigationKeys,
} from '@/features/commander/model/keyboard-handlers'
import type {
  CommanderFileDialogState,
  CommanderFileRow,
  CommanderPaneId,
  CommanderPendingOperation,
} from '@/features/commander/model/types'

function isInteractiveTextTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName.toLowerCase()

  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

/** Wires the pure commander key handlers into one widget-scoped `onKeyDownCapture` callback. */
export function useCommanderKeyboard(
  commanderActions: {
    clearActivePaneFilter: () => void
    closeFileDialog: () => void
    copySelection: () => void
    deleteSelection: () => void
    editActiveFile: () => void
    filterActivePane: () => void
    goBack: () => void
    goForward: () => void
    goParent: () => void
    invertSelection: () => void
    mkdir: () => void
    moveCursor: (delta: number, options?: { extendSelection?: boolean }) => void
    moveSelection: () => void
    openActiveEntry: () => void
    overwriteAllPendingConflicts: () => void
    overwritePendingConflict: () => void
    renameSelection: () => void
    searchActivePane: () => void
    selectByMask: () => void
    setBoundaryCursor: (
      paneId: CommanderPaneId,
      boundary: 'start' | 'end',
      options?: { extendSelection?: boolean },
    ) => void
    setCursor: (paneId: CommanderPaneId, entryId: string) => void
    skipAllPendingConflicts: () => void
    skipPendingConflict: () => void
    stepSearchMatch: (delta: 1 | -1) => void
    switchActivePane: () => void
    toggleSelectionAtCursor: (advance?: boolean) => void
    unselectByMask: () => void
    viewActiveFile: () => void
    confirmPendingOperation: () => void
    cancelPendingOperation: () => void
  },
  activePane: CommanderPaneId,
  activePaneRows: CommanderFileRow[],
  pendingOperation: CommanderPendingOperation | null,
  fileDialog: CommanderFileDialogState | null,
  options?: {
    onRequestPathEdit?: () => void
  },
) {
  const typeaheadRef = useRef<{
    prefix: string
    timestamp: number
  }>({
    prefix: '',
    timestamp: 0,
  })

  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (isInteractiveTextTarget(event.target)) {
        return
      }

      if (handleCommanderFileDialogKeys(event, Boolean(fileDialog), commanderActions)) {
        return
      }

      if (handleCommanderAltNavigationKeys(event, commanderActions)) {
        return
      }

      if (handleCommanderModifierKeys(event, commanderActions, options)) {
        return
      }

      if (handleCommanderPendingOperationKeys(event, pendingOperation, commanderActions)) {
        return
      }

      if (handleCommanderSelectionShortcutKeys(event, commanderActions)) {
        return
      }

      if (handleCommanderShiftNavigationKeys(event, activePane, commanderActions)) {
        return
      }

      const typeaheadResult = handleCommanderTypeaheadKey(
        event,
        activePane,
        activePaneRows,
        typeaheadRef.current,
        commanderActions,
      )
      typeaheadRef.current = typeaheadResult.nextTypeaheadState

      if (typeaheadResult.handled) {
        return
      }

      if (handleCommanderNavigationKeys(event, activePane, commanderActions)) {
        return
      }
    },
    [activePane, activePaneRows, commanderActions, fileDialog, options, pendingOperation],
  )
}
