import type { KeyboardEvent } from 'react'

import type { CommanderPendingOperation } from '@/features/commander/model/types'

type CommanderKeyboardEvent = Pick<
  KeyboardEvent<HTMLElement>,
  'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'preventDefault' | 'shiftKey'
>

type CommanderFileDialogKeyboardActions = {
  closeFileDialog: () => void
}

type CommanderModifierKeyboardActions = {
  clearActivePaneFilter: () => void
  filterActivePane: () => void
  goBack: () => void
  goForward: () => void
  goParent: () => void
  openActiveEntry: () => void
  searchActivePane: () => void
}

type CommanderPendingKeyboardActions = {
  cancelPendingOperation: () => void
  confirmPendingOperation: () => void
  overwriteAllPendingConflicts: () => void
  overwritePendingConflict: () => void
  skipAllPendingConflicts: () => void
  skipPendingConflict: () => void
  stepSearchMatch: (delta: 1 | -1) => void
}

type CommanderModifierKeyboardOptions = {
  onRequestPathEdit?: () => void
}

function hasCommanderPendingConflictResolution(pendingOperation: CommanderPendingOperation) {
  return (
    (pendingOperation.kind === 'copy' || pendingOperation.kind === 'move') &&
    Boolean(pendingOperation.conflictEntryNames?.length)
  )
}

export function handleCommanderFileDialogKeys(
  event: CommanderKeyboardEvent,
  isFileDialogOpen: boolean,
  commanderActions: CommanderFileDialogKeyboardActions,
) {
  if (!isFileDialogOpen) {
    return false
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    commanderActions.closeFileDialog()
  }

  return true
}

export function handleCommanderAltNavigationKeys(
  event: CommanderKeyboardEvent,
  commanderActions: Pick<CommanderModifierKeyboardActions, 'goBack' | 'goForward'>,
) {
  if (!event.altKey || event.metaKey || event.ctrlKey) {
    return false
  }

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      commanderActions.goBack()
      break
    case 'ArrowRight':
      event.preventDefault()
      commanderActions.goForward()
      break
    default:
      break
  }

  return true
}

export function handleCommanderModifierKeys(
  event: CommanderKeyboardEvent,
  commanderActions: CommanderModifierKeyboardActions,
  options?: CommanderModifierKeyboardOptions,
) {
  if (!event.metaKey && !event.ctrlKey) {
    return false
  }

  if (!event.metaKey && event.ctrlKey && (event.key === 'f' || event.key === 'F')) {
    event.preventDefault()
    commanderActions.filterActivePane()
    return true
  }

  if (!event.metaKey && event.ctrlKey && (event.key === 's' || event.key === 'S')) {
    event.preventDefault()
    commanderActions.searchActivePane()
    return true
  }

  if (!event.metaKey && event.ctrlKey && event.key === 'Backspace') {
    event.preventDefault()
    commanderActions.clearActivePaneFilter()
    return true
  }

  if (!event.metaKey && event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
    event.preventDefault()
    options?.onRequestPathEdit?.()
    return true
  }

  if (!event.metaKey && event.ctrlKey && event.key === 'PageUp') {
    event.preventDefault()
    commanderActions.goParent()
    return true
  }

  if (!event.metaKey && event.ctrlKey && event.key === 'PageDown') {
    event.preventDefault()
    commanderActions.openActiveEntry()
    return true
  }

  return true
}

export function handleCommanderPendingOperationKeys(
  event: CommanderKeyboardEvent,
  pendingOperation: CommanderPendingOperation | null,
  commanderActions: CommanderPendingKeyboardActions,
) {
  if (!pendingOperation) {
    return false
  }

  if (hasCommanderPendingConflictResolution(pendingOperation)) {
    if (event.key === 'Enter') {
      event.preventDefault()

      if (event.shiftKey) {
        commanderActions.overwriteAllPendingConflicts()
      } else {
        commanderActions.overwritePendingConflict()
      }

      return true
    }

    if (event.key === ' ') {
      event.preventDefault()

      if (event.shiftKey) {
        commanderActions.skipAllPendingConflicts()
      } else {
        commanderActions.skipPendingConflict()
      }

      return true
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      commanderActions.cancelPendingOperation()
    }

    return true
  }

  if (pendingOperation.kind === 'search') {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      commanderActions.stepSearchMatch(1)
      return true
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      commanderActions.stepSearchMatch(-1)
      return true
    }
  }

  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      commanderActions.confirmPendingOperation()
      break
    case 'Escape':
      event.preventDefault()
      commanderActions.cancelPendingOperation()
      break
    default:
      break
  }

  return true
}
