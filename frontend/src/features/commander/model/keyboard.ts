import { useCallback, useRef, type KeyboardEvent } from 'react'

import {
  handleCommanderAltNavigationKeys,
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

const COMMANDER_TYPEAHEAD_RESET_MS = 700

function isTypeaheadCharacter(event: KeyboardEvent<HTMLElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false
  }

  if (event.key.length !== 1) {
    return false
  }

  return event.key.trim().length > 0
}

function findNextTypeaheadMatch(rows: CommanderFileRow[], prefix: string) {
  if (!rows.length || !prefix) {
    return null
  }

  const normalizedPrefix = prefix.toLocaleLowerCase()
  const focusedIndex = rows.findIndex((row) => row.focused)
  const searchRows =
    focusedIndex === -1 ? rows : [...rows.slice(focusedIndex + 1), ...rows.slice(0, focusedIndex + 1)]

  return searchRows.find((row) => row.name.toLocaleLowerCase().startsWith(normalizedPrefix)) ?? null
}

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

      if (isTypeaheadCharacter(event)) {
        const now = Date.now()
        const normalizedCharacter = event.key.toLocaleLowerCase()
        const nextPrefix =
          now - typeaheadRef.current.timestamp <= COMMANDER_TYPEAHEAD_RESET_MS
            ? `${typeaheadRef.current.prefix}${normalizedCharacter}`
            : normalizedCharacter
        let resolvedPrefix = nextPrefix
        let matchedRow = findNextTypeaheadMatch(activePaneRows, resolvedPrefix)

        if (!matchedRow && nextPrefix.length > 1) {
          resolvedPrefix = normalizedCharacter
          matchedRow = findNextTypeaheadMatch(activePaneRows, resolvedPrefix)
        }

        if (!matchedRow) {
          typeaheadRef.current = {
            prefix: '',
            timestamp: 0,
          }
          return
        }

        typeaheadRef.current = {
          prefix: resolvedPrefix,
          timestamp: now,
        }
        event.preventDefault()
        commanderActions.setCursor(activePane, matchedRow.id)
        return
      }

      if (handleCommanderNavigationKeys(event, activePane, commanderActions)) {
        return
      }
    },
    [activePane, activePaneRows, commanderActions, fileDialog, options, pendingOperation],
  )
}
