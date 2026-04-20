import { useCallback, type KeyboardEvent } from 'react'

import { useCommanderActions } from './hooks'
import type { CommanderPaneId } from './types'

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
  hasPendingOperation: boolean,
) {
  const commanderActions = useCommanderActions(widgetId)

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
      return
    }

    if (hasPendingOperation) {
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
  }, [activePane, commanderActions, hasPendingOperation])
}
