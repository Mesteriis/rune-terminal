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

export function useCommanderKeyboard(widgetId: string, activePane: CommanderPaneId) {
  const commanderActions = useCommanderActions(widgetId)

  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (isInteractiveTextTarget(event.target)) {
      return
    }

    if (event.altKey || event.metaKey || event.ctrlKey) {
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
      default:
        return
    }
  }, [activePane, commanderActions])
}
