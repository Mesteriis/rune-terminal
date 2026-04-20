import { describe, expect, it, vi } from 'vitest'

import {
  confirmCommanderWidgetPendingOperation,
  updateCommanderPendingOperationInput,
} from '@/features/commander/model/store-operations'
import type {
  CommanderPendingOperation,
  CommanderRenamePreviewItem,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

type ConfirmationDeps = NonNullable<Parameters<typeof confirmCommanderWidgetPendingOperation>[2]>

function createWidgetState(pendingOperation: CommanderPendingOperation | null): CommanderWidgetRuntimeState {
  return {
    widgetId: 'widget-1',
    mode: 'commander',
    viewMode: 'split',
    activePane: 'left',
    showHidden: false,
    sortMode: 'name',
    sortDirection: 'asc',
    dirsFirst: true,
    footerHints: [],
    pendingOperation,
    fileDialog: null,
    leftPane: {
      id: 'left',
      path: '~/left',
      filterQuery: '',
      entries: [],
      cursorEntryId: 'entry-2',
      selectionAnchorEntryId: 'entry-2',
      selectedIds: [],
      historyBack: [],
      historyForward: [],
    },
    rightPane: {
      id: 'right',
      path: '~/right',
      filterQuery: '',
      entries: [],
      cursorEntryId: null,
      selectionAnchorEntryId: null,
      selectedIds: [],
      historyBack: [],
      historyForward: [],
    },
  }
}

function createConfirmationDeps(): ConfirmationDeps {
  return {
    copyCommanderEntries: vi.fn(),
    moveCommanderEntries: vi.fn(),
    deleteCommanderEntries: vi.fn(),
    mkdirCommanderDirectory: vi.fn(() => ({ entryId: 'mkdir-entry' })),
    previewCommanderRenameEntries: vi.fn(() => ({
      preview: [],
      conflictEntryNames: [],
      duplicateTargetNames: [],
    })),
    renameCommanderEntries: vi.fn(() => ({ entryIds: ['batch-renamed-entry'] })),
    getCommanderEntryNameConflict: vi.fn(() => false),
    renameCommanderEntry: vi.fn(() => ({ entryId: 'renamed-entry' })),
    refreshWidgetPanes: vi.fn((widgetState: CommanderWidgetRuntimeState, overrides) => ({
      ...widgetState,
      pendingOperation:
        overrides && Object.prototype.hasOwnProperty.call(overrides, 'pendingOperation')
          ? (overrides.pendingOperation ?? null)
          : widgetState.pendingOperation,
      leftPane: {
        ...widgetState.leftPane,
        ...overrides?.leftPane,
      },
      rightPane: {
        ...widgetState.rightPane,
        ...overrides?.rightPane,
      },
    })),
    updatePaneState: vi.fn((widgetState: CommanderWidgetRuntimeState, paneId, updater) => {
      const nextPaneState = updater(paneId === 'left' ? widgetState.leftPane : widgetState.rightPane)

      return {
        ...widgetState,
        [paneId === 'left' ? 'leftPane' : 'rightPane']: nextPaneState,
      } as CommanderWidgetRuntimeState
    }),
    rebuildPaneState: vi.fn((_widgetState: CommanderWidgetRuntimeState, paneState) => paneState),
    getPaneState: vi.fn((widgetState: CommanderWidgetRuntimeState, paneId) =>
      paneId === 'left' ? widgetState.leftPane : widgetState.rightPane,
    ),
    applySelectionMaskToPane: vi.fn((paneState) => ({
      ...paneState,
      selectedIds: ['masked-entry'],
    })),
    getCommanderSearchMatches: vi.fn(() => ({
      entryIds: ['match-1', 'match-2'],
      entryNames: ['match-1.txt', 'match-2.txt'],
    })),
    getCommanderResolvedSearchMatchIndex: vi.fn(() => 1),
  }
}

describe('updateCommanderPendingOperationInput', () => {
  it('returns null when no pending operation is active', () => {
    expect(updateCommanderPendingOperationInput(createWidgetState(null), 'widget-1', 'next-value')).toBeNull()
  })

  it('updates mask-based pending operations from mask matches', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'select',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: '*',
      matchCount: 0,
      matchPreview: [],
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', '*.ts', {
      getCommanderMaskMatches: vi.fn(() => ({
        entryIds: ['entry-1', 'entry-2', 'entry-3'],
        entryNames: ['alpha.ts', 'beta.ts', 'gamma.ts'],
      })),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'select',
      inputValue: '*.ts',
      matchCount: 3,
      matchPreview: ['alpha.ts', 'beta.ts', 'gamma.ts'],
    })
  })

  it('updates search pending operations and recalculates the resolved match index', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'search',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: '',
      matchCount: 0,
      matchPreview: [],
      matchIndex: 0,
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'term', {
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(() => ({
        entryIds: ['entry-1', 'entry-2'],
        entryNames: ['terminal.log', 'termrc'],
      })),
      getCommanderResolvedSearchMatchIndex: vi.fn(() => 1),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'search',
      inputValue: 'term',
      matchCount: 2,
      matchPreview: ['terminal.log', 'termrc'],
      matchIndex: 1,
    })
  })

  it('updates rename pending operations from the preview helper result', () => {
    const renamePreview: CommanderRenamePreviewItem[] = [
      {
        entryId: 'entry-1',
        currentName: 'old.txt',
        nextName: 'new.txt',
        status: 'conflict',
        conflict: true,
      },
    ]
    const pendingOperation: CommanderPendingOperation = {
      kind: 'rename',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: ['entry-1'],
      entryNames: ['old.txt'],
      inputValue: 'old.txt',
      renameMode: 'single',
      renamePreview: [],
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'new.txt', {
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderRenameEntries: vi.fn(() => ({
        preview: renamePreview,
        conflictEntryNames: ['new.txt'],
        duplicateTargetNames: ['duplicate.txt'],
      })),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'rename',
      inputValue: 'new.txt',
      conflictEntryNames: ['new.txt'],
      duplicateTargetNames: ['duplicate.txt'],
      renamePreview,
    })
  })

  it('preserves the fallback non-rename branch for unexpected input-capable operations', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'copy',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      targetPaneId: 'right',
      targetPath: '~/right',
      entryIds: ['entry-1'],
      entryNames: ['file.txt'],
      conflictEntryNames: ['file.txt'],
      inputValue: 'old-target',
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'new-target', {
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'copy',
      inputValue: 'new-target',
    })
    expect(nextWidgetState?.pendingOperation?.conflictEntryNames).toBeUndefined()
  })
})

describe('confirmCommanderWidgetPendingOperation', () => {
  it('returns null when no pending operation is active', () => {
    expect(confirmCommanderWidgetPendingOperation(createWidgetState(null), 'widget-1')).toBeNull()
  })

  it('applies copy operations and refreshes the widget panes', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'copy',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      targetPaneId: 'right',
      targetPath: '~/right',
      entryIds: ['entry-1'],
      entryNames: ['file.txt'],
    }
    const widgetState = createWidgetState(pendingOperation)
    const deps = createConfirmationDeps()

    const nextWidgetState = confirmCommanderWidgetPendingOperation(widgetState, 'widget-1', deps)

    expect(deps.copyCommanderEntries).toHaveBeenCalledWith({
      widgetId: 'widget-1',
      path: '~/left',
      targetPath: '~/right',
      entryIds: ['entry-1'],
      overwrite: false,
    })
    expect(deps.refreshWidgetPanes).toHaveBeenCalledTimes(1)
    expect(nextWidgetState?.pendingOperation).toBeNull()
  })

  it('keeps batch rename pending state open when the preview introduces duplicate targets', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'rename',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: ['entry-1', 'entry-2'],
      entryNames: ['a.txt', 'b.txt'],
      inputValue: '[N]-[C:2]',
      renameMode: 'batch',
      renamePreview: [],
    }
    const widgetState = createWidgetState(pendingOperation)
    const deps = createConfirmationDeps()
    deps.previewCommanderRenameEntries.mockReturnValue({
      preview: [
        {
          entryId: 'entry-1',
          currentName: 'a.txt',
          nextName: 'dup.txt',
          status: 'duplicate',
          conflict: false,
        },
      ],
      conflictEntryNames: [],
      duplicateTargetNames: ['dup.txt'],
    })

    const nextWidgetState = confirmCommanderWidgetPendingOperation(widgetState, 'widget-1', deps)

    expect(deps.renameCommanderEntries).not.toHaveBeenCalled()
    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'rename',
      duplicateTargetNames: ['dup.txt'],
    })
  })

  it('keeps single rename pending state open when the destination name already exists', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'rename',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: ['entry-1'],
      entryNames: ['old.txt'],
      inputValue: 'new.txt',
      renameMode: 'single',
      renamePreview: [],
    }
    const widgetState = createWidgetState(pendingOperation)
    const deps = createConfirmationDeps()
    deps.getCommanderEntryNameConflict.mockReturnValue(true)

    const nextWidgetState = confirmCommanderWidgetPendingOperation(widgetState, 'widget-1', deps)

    expect(deps.renameCommanderEntry).not.toHaveBeenCalled()
    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'rename',
      conflictEntryNames: ['new.txt'],
    })
  })

  it('resolves search confirmation into a cursor move and clears the pending operation', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'search',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: 'match',
      matchCount: 2,
      matchPreview: ['match-1.txt', 'match-2.txt'],
      matchIndex: 0,
    }
    const widgetState = createWidgetState(pendingOperation)
    const deps = createConfirmationDeps()

    const nextWidgetState = confirmCommanderWidgetPendingOperation(widgetState, 'widget-1', deps)

    expect(deps.getCommanderSearchMatches).toHaveBeenCalledTimes(1)
    expect(nextWidgetState?.pendingOperation).toBeNull()
    expect(nextWidgetState?.leftPane.cursorEntryId).toBe('match-2')
    expect(nextWidgetState?.leftPane.selectionAnchorEntryId).toBe('match-2')
  })
})
