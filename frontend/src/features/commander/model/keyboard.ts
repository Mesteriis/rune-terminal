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
import { useCommanderActions } from '@/features/commander/model/hooks'
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
  widgetId: string,
  activePane: CommanderPaneId,
  activePaneRows: CommanderFileRow[],
  pendingOperation: CommanderPendingOperation | null,
  fileDialog: CommanderFileDialogState | null,
  options?: {
    onRequestPathEdit?: () => void
  },
) {
  const commanderActions = useCommanderActions(widgetId)
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
