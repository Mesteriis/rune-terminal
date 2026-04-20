import type { KeyboardEvent } from 'react'

import type {
  CommanderFileRow,
  CommanderPaneId,
  CommanderPendingOperation,
} from '@/features/commander/model/types'

/** Maximum idle gap before the incremental typeahead prefix resets. */
export const COMMANDER_TYPEAHEAD_RESET_MS = 700

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

type CommanderSelectionShortcutActions = {
  invertSelection: () => void
  selectByMask: () => void
  unselectByMask: () => void
}

type CommanderShiftKeyboardActions = {
  moveCursor: (delta: number, options?: { extendSelection?: boolean }) => void
  renameSelection: () => void
  setBoundaryCursor: (
    paneId: CommanderPaneId,
    boundary: 'start' | 'end',
    options?: { extendSelection?: boolean },
  ) => void
}

type CommanderNavigationKeyboardActions = {
  copySelection: () => void
  deleteSelection: () => void
  editActiveFile: () => void
  goParent: () => void
  mkdir: () => void
  moveCursor: (delta: number, options?: { extendSelection?: boolean }) => void
  moveSelection: () => void
  openActiveEntry: () => void
  renameSelection: () => void
  setBoundaryCursor: (paneId: CommanderPaneId, boundary: 'start' | 'end') => void
  switchActivePane: () => void
  toggleSelectionAtCursor: (advance: boolean) => void
  viewActiveFile: () => void
}

/** Tracks the current incremental typeahead prefix between key presses. */
export type CommanderTypeaheadState = {
  prefix: string
  timestamp: number
}

type CommanderTypeaheadActions = {
  setCursor: (paneId: CommanderPaneId, entryId: string) => void
}

type CommanderTypeaheadResult = {
  handled: boolean
  nextTypeaheadState: CommanderTypeaheadState
}

function hasCommanderPendingConflictResolution(pendingOperation: CommanderPendingOperation) {
  return (
    (pendingOperation.kind === 'copy' || pendingOperation.kind === 'move') &&
    Boolean(pendingOperation.conflictEntryNames?.length)
  )
}

function isTypeaheadCharacter(event: CommanderKeyboardEvent) {
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

/** Handles the global escape contract while the file dialog owns interaction. */
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

/** Handles `Alt+Left/Right` history traversal before the rest of commander navigation runs. */
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

/** Handles ctrl/meta modifier shortcuts such as filter, search, path edit, and parent/open navigation. */
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

/** Handles the pending-operation keyboard contract, including conflict resolution and search stepping. */
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

/** Handles the numpad-driven selection shortcuts without mixing them into main navigation. */
export function handleCommanderSelectionShortcutKeys(
  event: CommanderKeyboardEvent & Pick<KeyboardEvent<HTMLElement>, 'code'>,
  commanderActions: CommanderSelectionShortcutActions,
) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false
  }

  switch (event.code) {
    case 'NumpadAdd':
      event.preventDefault()
      commanderActions.selectByMask()
      return true
    case 'NumpadSubtract':
      event.preventDefault()
      commanderActions.unselectByMask()
      return true
    case 'NumpadMultiply':
      event.preventDefault()
      commanderActions.invertSelection()
      return true
    default:
      return false
  }
}

/** Handles shift-extended cursor movement and range-aware rename shortcuts. */
export function handleCommanderShiftNavigationKeys(
  event: CommanderKeyboardEvent,
  activePane: CommanderPaneId,
  commanderActions: CommanderShiftKeyboardActions,
) {
  if (!event.shiftKey) {
    return false
  }

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      commanderActions.moveCursor(-1, { extendSelection: true })
      return true
    case 'ArrowDown':
      event.preventDefault()
      commanderActions.moveCursor(1, { extendSelection: true })
      return true
    case 'PageUp':
      event.preventDefault()
      commanderActions.moveCursor(-10, { extendSelection: true })
      return true
    case 'PageDown':
      event.preventDefault()
      commanderActions.moveCursor(10, { extendSelection: true })
      return true
    case 'Home':
      event.preventDefault()
      commanderActions.setBoundaryCursor(activePane, 'start', { extendSelection: true })
      return true
    case 'End':
      event.preventDefault()
      commanderActions.setBoundaryCursor(activePane, 'end', { extendSelection: true })
      return true
    case 'F6':
      event.preventDefault()
      commanderActions.renameSelection()
      return true
    default:
      return false
  }
}

/** Handles the core commander navigation contract once higher-priority flows declined the event. */
export function handleCommanderNavigationKeys(
  event: CommanderKeyboardEvent,
  activePane: CommanderPaneId,
  commanderActions: CommanderNavigationKeyboardActions,
) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      commanderActions.moveCursor(-1)
      return true
    case 'ArrowDown':
      event.preventDefault()
      commanderActions.moveCursor(1)
      return true
    case 'PageUp':
      event.preventDefault()
      commanderActions.moveCursor(-10)
      return true
    case 'PageDown':
      event.preventDefault()
      commanderActions.moveCursor(10)
      return true
    case 'Home':
      event.preventDefault()
      commanderActions.setBoundaryCursor(activePane, 'start')
      return true
    case 'End':
      event.preventDefault()
      commanderActions.setBoundaryCursor(activePane, 'end')
      return true
    case 'Tab':
      event.preventDefault()
      commanderActions.switchActivePane()
      return true
    case 'Backspace':
      event.preventDefault()
      commanderActions.goParent()
      return true
    case 'Enter':
      event.preventDefault()
      commanderActions.openActiveEntry()
      return true
    case 'Insert':
      event.preventDefault()
      commanderActions.toggleSelectionAtCursor(true)
      return true
    case ' ':
    case 'Spacebar':
      event.preventDefault()
      commanderActions.toggleSelectionAtCursor(false)
      return true
    case 'F5':
      event.preventDefault()
      commanderActions.copySelection()
      return true
    case 'F6':
      event.preventDefault()
      commanderActions.moveSelection()
      return true
    case 'F7':
      event.preventDefault()
      commanderActions.mkdir()
      return true
    case 'F8':
      event.preventDefault()
      commanderActions.deleteSelection()
      return true
    case 'F2':
      event.preventDefault()
      commanderActions.renameSelection()
      return true
    case 'F3':
      event.preventDefault()
      commanderActions.viewActiveFile()
      return true
    case 'F4':
      event.preventDefault()
      commanderActions.editActiveFile()
      return true
    default:
      return false
  }
}

/** Resolves character-by-character typeahead against the currently visible active-pane rows. */
export function handleCommanderTypeaheadKey(
  event: CommanderKeyboardEvent,
  activePane: CommanderPaneId,
  activePaneRows: CommanderFileRow[],
  typeaheadState: CommanderTypeaheadState,
  commanderActions: CommanderTypeaheadActions,
  now = Date.now(),
): CommanderTypeaheadResult {
  if (!isTypeaheadCharacter(event)) {
    return {
      handled: false,
      nextTypeaheadState: typeaheadState,
    }
  }

  const normalizedCharacter = event.key.toLocaleLowerCase()
  const nextPrefix =
    now - typeaheadState.timestamp <= COMMANDER_TYPEAHEAD_RESET_MS
      ? `${typeaheadState.prefix}${normalizedCharacter}`
      : normalizedCharacter
  let resolvedPrefix = nextPrefix
  let matchedRow = findNextTypeaheadMatch(activePaneRows, resolvedPrefix)

  if (!matchedRow && nextPrefix.length > 1) {
    resolvedPrefix = normalizedCharacter
    matchedRow = findNextTypeaheadMatch(activePaneRows, resolvedPrefix)
  }

  if (!matchedRow) {
    return {
      handled: true,
      nextTypeaheadState: {
        prefix: '',
        timestamp: 0,
      },
    }
  }

  event.preventDefault()
  commanderActions.setCursor(activePane, matchedRow.id)

  return {
    handled: true,
    nextTypeaheadState: {
      prefix: resolvedPrefix,
      timestamp: now,
    },
  }
}
