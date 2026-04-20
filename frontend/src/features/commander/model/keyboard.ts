import { useCallback, useRef, type KeyboardEvent } from 'react'

import { useCommanderActions } from './hooks'
import type { CommanderFileRow, CommanderPaneId, CommanderPendingOperation } from './types'

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

function findNextTypeaheadMatch(
  rows: CommanderFileRow[],
  prefix: string,
) {
  if (!rows.length || !prefix) {
    return null
  }

  const normalizedPrefix = prefix.toLocaleLowerCase()
  const focusedIndex = rows.findIndex((row) => row.focused)
  const searchRows = focusedIndex === -1
    ? rows
    : [...rows.slice(focusedIndex + 1), ...rows.slice(0, focusedIndex + 1)]

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

  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (isInteractiveTextTarget(event.target)) {
      return
    }

    if (event.altKey && !event.metaKey && !event.ctrlKey) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          commanderActions.goBack()
          return
        case 'ArrowRight':
          event.preventDefault()
          commanderActions.goForward()
          return
        default:
          return
      }
    }

    if (event.metaKey || event.ctrlKey) {
      if (!event.metaKey && event.ctrlKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault()
        commanderActions.filterActivePane()
        return
      }

      if (!event.metaKey && event.ctrlKey && event.key === 'Backspace') {
        event.preventDefault()
        commanderActions.clearActivePaneFilter()
        return
      }

      if (!event.metaKey && event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
        event.preventDefault()
        options?.onRequestPathEdit?.()
        return
      }

      if (!event.metaKey && event.ctrlKey && event.key === 'PageUp') {
        event.preventDefault()
        commanderActions.goParent()
        return
      }

      if (!event.metaKey && event.ctrlKey && event.key === 'PageDown') {
        event.preventDefault()
        commanderActions.openActiveEntry()
      }

      return
    }

    if (pendingOperation) {
      const hasPendingConflictResolution = (
        (pendingOperation.kind === 'copy' || pendingOperation.kind === 'move')
        && Boolean(pendingOperation.conflictEntryNames?.length)
      )

      if (hasPendingConflictResolution) {
        if (event.key === 'Enter') {
          event.preventDefault()

          if (event.shiftKey) {
            commanderActions.overwriteAllPendingConflicts()
            return
          }

          commanderActions.overwritePendingConflict()
          return
        }

        if (event.key === ' ') {
          event.preventDefault()

          if (event.shiftKey) {
            commanderActions.skipAllPendingConflicts()
            return
          }

          commanderActions.skipPendingConflict()
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          commanderActions.cancelPendingOperation()
          return
        }

        return
      }

      switch (event.key) {
        case 'Enter':
          event.preventDefault()
          commanderActions.confirmPendingOperation()
          return
        case 'Escape':
          event.preventDefault()
          commanderActions.cancelPendingOperation()
          return
        default:
          return
      }
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      switch (event.code) {
        case 'NumpadAdd':
          event.preventDefault()
          commanderActions.selectByMask()
          return
        case 'NumpadSubtract':
          event.preventDefault()
          commanderActions.unselectByMask()
          return
        case 'NumpadMultiply':
          event.preventDefault()
          commanderActions.invertSelection()
          return
        default:
          break
      }
    }

    if (event.shiftKey) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          commanderActions.moveCursor(-1, { extendSelection: true })
          return
        case 'ArrowDown':
          event.preventDefault()
          commanderActions.moveCursor(1, { extendSelection: true })
          return
        case 'PageUp':
          event.preventDefault()
          commanderActions.moveCursor(-10, { extendSelection: true })
          return
        case 'PageDown':
          event.preventDefault()
          commanderActions.moveCursor(10, { extendSelection: true })
          return
        case 'Home':
          event.preventDefault()
          commanderActions.setBoundaryCursor(activePane, 'start', { extendSelection: true })
          return
        case 'End':
          event.preventDefault()
          commanderActions.setBoundaryCursor(activePane, 'end', { extendSelection: true })
          return
        case 'F6':
          event.preventDefault()
          commanderActions.renameSelection()
          return
        default:
          break
      }
    }

    if (isTypeaheadCharacter(event)) {
      const now = Date.now()
      const normalizedCharacter = event.key.toLocaleLowerCase()
      const nextPrefix = now - typeaheadRef.current.timestamp <= COMMANDER_TYPEAHEAD_RESET_MS
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

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        commanderActions.moveCursor(-1)
        return
      case 'ArrowDown':
        event.preventDefault()
        commanderActions.moveCursor(1)
        return
      case 'PageUp':
        event.preventDefault()
        commanderActions.moveCursor(-10)
        return
      case 'PageDown':
        event.preventDefault()
        commanderActions.moveCursor(10)
        return
      case 'Home':
        event.preventDefault()
        commanderActions.setBoundaryCursor(activePane, 'start')
        return
      case 'End':
        event.preventDefault()
        commanderActions.setBoundaryCursor(activePane, 'end')
        return
      case 'Tab':
        event.preventDefault()
        commanderActions.switchActivePane()
        return
      case 'Backspace':
        event.preventDefault()
        commanderActions.goParent()
        return
      case 'Enter':
        event.preventDefault()
        commanderActions.openActiveEntry()
        return
      case 'Insert':
        event.preventDefault()
        commanderActions.toggleSelectionAtCursor(true)
        return
      case ' ':
      case 'Spacebar':
        event.preventDefault()
        commanderActions.toggleSelectionAtCursor(false)
        return
      case 'F5':
        event.preventDefault()
        commanderActions.copySelection()
        return
      case 'F6':
        event.preventDefault()
        commanderActions.moveSelection()
        return
      case 'F7':
        event.preventDefault()
        commanderActions.mkdir()
        return
      case 'F8':
        event.preventDefault()
        commanderActions.deleteSelection()
        return
      case 'F2':
        event.preventDefault()
        commanderActions.renameSelection()
        return
      default:
        return
    }
  }, [activePane, activePaneRows, commanderActions, options, pendingOperation])
}
