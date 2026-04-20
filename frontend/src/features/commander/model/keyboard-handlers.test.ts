import { describe, expect, it, vi } from 'vitest'

import {
  handleCommanderAltNavigationKeys,
  handleCommanderFileDialogKeys,
  handleCommanderModifierKeys,
  handleCommanderPendingOperationKeys,
} from '@/features/commander/model/keyboard-handlers'
import type { CommanderPendingOperation } from '@/features/commander/model/types'

function createKeyboardEvent(
  overrides: Partial<{
    altKey: boolean
    ctrlKey: boolean
    key: string
    metaKey: boolean
    shiftKey: boolean
  }> = {},
) {
  return {
    altKey: false,
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
