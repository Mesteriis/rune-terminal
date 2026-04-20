import { describe, expect, it, vi } from 'vitest'

import {
  COMMANDER_TYPEAHEAD_RESET_MS,
  handleCommanderAltNavigationKeys,
  handleCommanderFileDialogKeys,
  handleCommanderModifierKeys,
  handleCommanderNavigationKeys,
  handleCommanderPendingOperationKeys,
  handleCommanderSelectionShortcutKeys,
  handleCommanderShiftNavigationKeys,
  handleCommanderTypeaheadKey,
} from '@/features/commander/model/keyboard-handlers'
import type { CommanderFileRow, CommanderPendingOperation } from '@/features/commander/model/types'

function createKeyboardEvent(
  overrides: Partial<{
    altKey: boolean
    code: string
    ctrlKey: boolean
    key: string
    metaKey: boolean
    shiftKey: boolean
  }> = {},
) {
  return {
    altKey: false,
    code: '',
    ctrlKey: false,
    key: '',
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  }
}

function createPendingOperation(
  overrides: Partial<CommanderPendingOperation> = {},
): CommanderPendingOperation {
  return {
    kind: 'copy',
    sourcePaneId: 'left',
    sourcePath: '~/left',
    targetPaneId: 'right',
    targetPath: '~/right',
    entryIds: ['entry-1'],
    entryNames: ['entry-1.txt'],
    ...overrides,
  }
}

function createFileRow(
  id: string,
  name: string,
  overrides: Partial<CommanderFileRow> = {},
): CommanderFileRow {
  return {
    id,
    name,
    ext: '',
    focused: false,
    hidden: false,
    kind: 'file',
    modified: '2026-04-20',
    selected: false,
    size: '1 KB',
    ...overrides,
  }
}

describe('handleCommanderFileDialogKeys', () => {
  it('blocks keyboard handling while the dialog is open and closes on Escape', () => {
    const event = createKeyboardEvent({ key: 'Escape' })
    const commanderActions = {
      closeFileDialog: vi.fn(),
    }

    const handled = handleCommanderFileDialogKeys(event, true, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.closeFileDialog).toHaveBeenCalledOnce()
  })

  it('still blocks unrelated keys while the dialog is open', () => {
    const event = createKeyboardEvent({ key: 'ArrowDown' })
    const commanderActions = {
      closeFileDialog: vi.fn(),
    }

    const handled = handleCommanderFileDialogKeys(event, true, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(commanderActions.closeFileDialog).not.toHaveBeenCalled()
  })
})

describe('handleCommanderAltNavigationKeys', () => {
  it('routes Alt+ArrowLeft to pane history back', () => {
    const event = createKeyboardEvent({ altKey: true, key: 'ArrowLeft' })
    const commanderActions = {
      goBack: vi.fn(),
      goForward: vi.fn(),
    }

    const handled = handleCommanderAltNavigationKeys(event, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.goBack).toHaveBeenCalledOnce()
    expect(commanderActions.goForward).not.toHaveBeenCalled()
  })

  it('blocks other plain Alt shortcuts from falling through', () => {
    const event = createKeyboardEvent({ altKey: true, key: 'x' })
    const commanderActions = {
      goBack: vi.fn(),
      goForward: vi.fn(),
    }

    const handled = handleCommanderAltNavigationKeys(event, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(commanderActions.goBack).not.toHaveBeenCalled()
    expect(commanderActions.goForward).not.toHaveBeenCalled()
  })
})

describe('handleCommanderModifierKeys', () => {
  it('routes Ctrl+F to active-pane filter', () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: 'f' })
    const commanderActions = {
      clearActivePaneFilter: vi.fn(),
      filterActivePane: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      goParent: vi.fn(),
      openActiveEntry: vi.fn(),
      searchActivePane: vi.fn(),
    }

    const handled = handleCommanderModifierKeys(event, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.filterActivePane).toHaveBeenCalledOnce()
  })

  it('routes Ctrl+L to the path-edit callback', () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: 'L' })
    const commanderActions = {
      clearActivePaneFilter: vi.fn(),
      filterActivePane: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      goParent: vi.fn(),
      openActiveEntry: vi.fn(),
      searchActivePane: vi.fn(),
    }
    const onRequestPathEdit = vi.fn()

    const handled = handleCommanderModifierKeys(event, commanderActions, { onRequestPathEdit })

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(onRequestPathEdit).toHaveBeenCalledOnce()
  })

  it('blocks unmatched meta shortcuts from falling through to navigation handlers', () => {
    const event = createKeyboardEvent({ key: 'f', metaKey: true })
    const commanderActions = {
      clearActivePaneFilter: vi.fn(),
      filterActivePane: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      goParent: vi.fn(),
      openActiveEntry: vi.fn(),
      searchActivePane: vi.fn(),
    }

    const handled = handleCommanderModifierKeys(event, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(commanderActions.filterActivePane).not.toHaveBeenCalled()
  })
})

describe('handleCommanderPendingOperationKeys', () => {
  it('routes search stepping keys through the pending search controller', () => {
    const event = createKeyboardEvent({ key: 'ArrowDown' })
    const pendingOperation = createPendingOperation({ kind: 'search' })
    const commanderActions = {
      cancelPendingOperation: vi.fn(),
      confirmPendingOperation: vi.fn(),
      overwriteAllPendingConflicts: vi.fn(),
      overwritePendingConflict: vi.fn(),
      skipAllPendingConflicts: vi.fn(),
      skipPendingConflict: vi.fn(),
      stepSearchMatch: vi.fn(),
    }

    const handled = handleCommanderPendingOperationKeys(event, pendingOperation, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.stepSearchMatch).toHaveBeenCalledWith(1)
  })

  it('routes conflict confirmation keys to overwrite-all and skip-all', () => {
    const overwriteEvent = createKeyboardEvent({ key: 'Enter', shiftKey: true })
    const skipEvent = createKeyboardEvent({ key: ' ', shiftKey: true })
    const pendingOperation = createPendingOperation({
      conflictEntryNames: ['entry-1.txt'],
      kind: 'move',
    })
    const commanderActions = {
      cancelPendingOperation: vi.fn(),
      confirmPendingOperation: vi.fn(),
      overwriteAllPendingConflicts: vi.fn(),
      overwritePendingConflict: vi.fn(),
      skipAllPendingConflicts: vi.fn(),
      skipPendingConflict: vi.fn(),
      stepSearchMatch: vi.fn(),
    }

    expect(handleCommanderPendingOperationKeys(overwriteEvent, pendingOperation, commanderActions)).toBe(true)
    expect(handleCommanderPendingOperationKeys(skipEvent, pendingOperation, commanderActions)).toBe(true)

    expect(overwriteEvent.preventDefault).toHaveBeenCalledOnce()
    expect(skipEvent.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.overwriteAllPendingConflicts).toHaveBeenCalledOnce()
    expect(commanderActions.skipAllPendingConflicts).toHaveBeenCalledOnce()
  })

  it('keeps unmatched pending keys from falling through to the main navigation switch', () => {
    const event = createKeyboardEvent({ key: 'Tab' })
    const pendingOperation = createPendingOperation({ kind: 'mkdir' })
    const commanderActions = {
      cancelPendingOperation: vi.fn(),
      confirmPendingOperation: vi.fn(),
      overwriteAllPendingConflicts: vi.fn(),
      overwritePendingConflict: vi.fn(),
      skipAllPendingConflicts: vi.fn(),
      skipPendingConflict: vi.fn(),
      stepSearchMatch: vi.fn(),
    }

    const handled = handleCommanderPendingOperationKeys(event, pendingOperation, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(commanderActions.confirmPendingOperation).not.toHaveBeenCalled()
  })
})

describe('handleCommanderSelectionShortcutKeys', () => {
  it('routes numpad selection shortcuts without falling into the main switch', () => {
    const event = createKeyboardEvent({ code: 'NumpadAdd' })
    const commanderActions = {
      invertSelection: vi.fn(),
      selectByMask: vi.fn(),
      unselectByMask: vi.fn(),
    }

    const handled = handleCommanderSelectionShortcutKeys(event, commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.selectByMask).toHaveBeenCalledOnce()
  })
})

describe('handleCommanderShiftNavigationKeys', () => {
  it('routes Shift+End to an extending boundary move', () => {
    const event = createKeyboardEvent({ key: 'End', shiftKey: true })
    const commanderActions = {
      moveCursor: vi.fn(),
      renameSelection: vi.fn(),
      setBoundaryCursor: vi.fn(),
    }

    const handled = handleCommanderShiftNavigationKeys(event, 'left', commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.setBoundaryCursor).toHaveBeenCalledWith('left', 'end', { extendSelection: true })
  })

  it('leaves unmatched Shift shortcuts for later handlers', () => {
    const event = createKeyboardEvent({ key: 'Tab', shiftKey: true })
    const commanderActions = {
      moveCursor: vi.fn(),
      renameSelection: vi.fn(),
      setBoundaryCursor: vi.fn(),
    }

    const handled = handleCommanderShiftNavigationKeys(event, 'left', commanderActions)

    expect(handled).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})

describe('handleCommanderNavigationKeys', () => {
  it('routes Space to toggle selection without advancing the cursor', () => {
    const event = createKeyboardEvent({ key: ' ' })
    const commanderActions = {
      copySelection: vi.fn(),
      deleteSelection: vi.fn(),
      editActiveFile: vi.fn(),
      goParent: vi.fn(),
      mkdir: vi.fn(),
      moveCursor: vi.fn(),
      moveSelection: vi.fn(),
      openActiveEntry: vi.fn(),
      renameSelection: vi.fn(),
      setBoundaryCursor: vi.fn(),
      switchActivePane: vi.fn(),
      toggleSelectionAtCursor: vi.fn(),
      viewActiveFile: vi.fn(),
    }

    const handled = handleCommanderNavigationKeys(event, 'right', commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.toggleSelectionAtCursor).toHaveBeenCalledWith(false)
  })

  it('routes F3 to the active-file viewer', () => {
    const event = createKeyboardEvent({ key: 'F3' })
    const commanderActions = {
      copySelection: vi.fn(),
      deleteSelection: vi.fn(),
      editActiveFile: vi.fn(),
      goParent: vi.fn(),
      mkdir: vi.fn(),
      moveCursor: vi.fn(),
      moveSelection: vi.fn(),
      openActiveEntry: vi.fn(),
      renameSelection: vi.fn(),
      setBoundaryCursor: vi.fn(),
      switchActivePane: vi.fn(),
      toggleSelectionAtCursor: vi.fn(),
      viewActiveFile: vi.fn(),
    }

    const handled = handleCommanderNavigationKeys(event, 'left', commanderActions)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.viewActiveFile).toHaveBeenCalledOnce()
  })

  it('returns false for keys outside the main navigation map', () => {
    const event = createKeyboardEvent({ key: 'x' })
    const commanderActions = {
      copySelection: vi.fn(),
      deleteSelection: vi.fn(),
      editActiveFile: vi.fn(),
      goParent: vi.fn(),
      mkdir: vi.fn(),
      moveCursor: vi.fn(),
      moveSelection: vi.fn(),
      openActiveEntry: vi.fn(),
      renameSelection: vi.fn(),
      setBoundaryCursor: vi.fn(),
      switchActivePane: vi.fn(),
      toggleSelectionAtCursor: vi.fn(),
      viewActiveFile: vi.fn(),
    }

    const handled = handleCommanderNavigationKeys(event, 'left', commanderActions)

    expect(handled).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})

describe('handleCommanderTypeaheadKey', () => {
  it('moves the cursor to the first matching prefix and stores the prefix state', () => {
    const event = createKeyboardEvent({ key: 'a' })
    const commanderActions = {
      setCursor: vi.fn(),
    }
    const rows = [
      createFileRow('entry-1', 'alpha.txt'),
      createFileRow('entry-2', 'beta.txt', { focused: true }),
    ]

    const result = handleCommanderTypeaheadKey(
      event,
      'left',
      rows,
      { prefix: '', timestamp: 0 },
      commanderActions,
      1_000,
    )

    expect(result).toEqual({
      handled: true,
      nextTypeaheadState: {
        prefix: 'a',
        timestamp: 1_000,
      },
    })
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(commanderActions.setCursor).toHaveBeenCalledWith('left', 'entry-1')
  })

  it('falls back to the latest character when the accumulated prefix no longer matches', () => {
    const event = createKeyboardEvent({ key: 'c' })
    const commanderActions = {
      setCursor: vi.fn(),
    }
    const rows = [
      createFileRow('entry-1', 'alpha.txt', { focused: true }),
      createFileRow('entry-2', 'charlie.txt'),
    ]

    const result = handleCommanderTypeaheadKey(
      event,
      'left',
      rows,
      { prefix: 'a', timestamp: 1_000 },
      commanderActions,
      1_000 + COMMANDER_TYPEAHEAD_RESET_MS - 1,
    )

    expect(result.nextTypeaheadState).toEqual({
      prefix: 'c',
      timestamp: 1_000 + COMMANDER_TYPEAHEAD_RESET_MS - 1,
    })
    expect(commanderActions.setCursor).toHaveBeenCalledWith('left', 'entry-2')
  })

  it('resets the typeahead state when no printable match exists', () => {
    const event = createKeyboardEvent({ key: 'z' })
    const commanderActions = {
      setCursor: vi.fn(),
    }
    const rows = [createFileRow('entry-1', 'alpha.txt')]

    const result = handleCommanderTypeaheadKey(
      event,
      'left',
      rows,
      { prefix: 'a', timestamp: 1_000 },
      commanderActions,
      1_001,
    )

    expect(result).toEqual({
      handled: true,
      nextTypeaheadState: {
        prefix: '',
        timestamp: 0,
      },
    })
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(commanderActions.setCursor).not.toHaveBeenCalled()
  })

  it('ignores non-printable keys and leaves the current typeahead state untouched', () => {
    const event = createKeyboardEvent({ key: 'ArrowDown' })
    const commanderActions = {
      setCursor: vi.fn(),
    }

    const result = handleCommanderTypeaheadKey(
      event,
      'left',
      [],
      { prefix: 'a', timestamp: 1_000 },
      commanderActions,
      2_000,
    )

    expect(result).toEqual({
      handled: false,
      nextTypeaheadState: {
        prefix: 'a',
        timestamp: 1_000,
      },
    })
    expect(commanderActions.setCursor).not.toHaveBeenCalled()
  })
})
