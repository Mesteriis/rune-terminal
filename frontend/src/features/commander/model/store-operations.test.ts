import { describe, expect, it, vi } from 'vitest'

import {
  confirmCommanderWidgetPendingOperation,
  createPendingOperation,
  requestCommanderWidgetPendingOperation,
  stepCommanderWidgetPendingSearchMatch,
  updateCommanderPendingOperationInput,
} from '@/features/commander/model/store-operations'
import type {
  CommanderPendingOperation,
  CommanderRenamePreviewItem,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

type ConfirmationDeps = NonNullable<Parameters<typeof confirmCommanderWidgetPendingOperation>[2]>
type PendingRequestDeps = NonNullable<Parameters<typeof requestCommanderWidgetPendingOperation>[2]>
type PendingSearchStepDeps = NonNullable<Parameters<typeof stepCommanderWidgetPendingSearchMatch>[2]>

const sampleFileEntry = {
  id: '/repo/tmp::README.md',
  name: 'README.md',
  ext: 'md',
  kind: 'file' as const,
  sizeLabel: '1 B',
  sizeBytes: 1,
  modified: '2026-04-21 10:00',
  hidden: false,
}

function createWidgetState(pendingOperation: CommanderPendingOperation | null): CommanderWidgetRuntimeState {
  return {
    widgetId: 'widget-1',
    dataSource: 'backend',
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
      directoryEntries: [],
      entries: [],
      cursorEntryId: 'entry-2',
      selectionAnchorEntryId: 'entry-2',
      selectedIds: [],
      historyBack: [],
      historyForward: [],
      isLoading: false,
      errorMessage: null,
    },
    rightPane: {
      id: 'right',
      path: '~/right',
      filterQuery: '',
      directoryEntries: [],
      entries: [],
      cursorEntryId: null,
      selectionAnchorEntryId: null,
      selectedIds: [],
      historyBack: [],
      historyForward: [],
      isLoading: false,
      errorMessage: null,
    },
  }
}

function createConfirmationDeps(): ConfirmationDeps {
  return {
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

function createPendingRequestDeps(): PendingRequestDeps {
  return {
    createPendingOperation: vi.fn(),
  }
}

function createPendingSearchStepDeps(): PendingSearchStepDeps {
  return {
    getPaneState: vi.fn((widgetState: CommanderWidgetRuntimeState, paneId) =>
      paneId === 'left' ? widgetState.leftPane : widgetState.rightPane,
    ),
    getCommanderSearchMatches: vi.fn(() => ({
      entryIds: ['match-1', 'match-2', 'match-3'],
      entryNames: ['match-1.txt', 'match-2.txt', 'match-3.txt'],
    })),
    getCommanderResolvedSearchMatchIndex: vi.fn(() => 0),
    updatePaneState: vi.fn((widgetState: CommanderWidgetRuntimeState, paneId, updater) => {
      const nextPaneState = updater(paneId === 'left' ? widgetState.leftPane : widgetState.rightPane)

      return {
        ...widgetState,
        [paneId === 'left' ? 'leftPane' : 'rightPane']: nextPaneState,
      } as CommanderWidgetRuntimeState
    }),
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
      getCommanderEntryNameConflict: vi.fn(),
      getCommanderMaskMatches: vi.fn(() => ({
        entryIds: ['entry-1', 'entry-2', 'entry-3'],
        entryNames: ['alpha.ts', 'beta.ts', 'gamma.ts'],
      })),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderCloneEntries: vi.fn(),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'select',
      inputValue: '*.ts',
      matchCount: 3,
      matchPreview: ['alpha.ts', 'beta.ts', 'gamma.ts'],
    })
  })

  it('updates mkdir pending operations from the inline input value', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'mkdir',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: 'New folder',
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'notes', {
      getCommanderEntryNameConflict: vi.fn(),
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderCloneEntries: vi.fn(),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'mkdir',
      inputValue: 'notes',
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
      getCommanderEntryNameConflict: vi.fn(),
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(() => ({
        entryIds: ['entry-1', 'entry-2'],
        entryNames: ['terminal.log', 'termrc'],
      })),
      getCommanderResolvedSearchMatchIndex: vi.fn(() => 1),
      previewCommanderCloneEntries: vi.fn(),
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
      conflictEntryNames: [],
      duplicateTargetNames: [],
      renameMode: 'single',
      renamePreview: [],
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'new.txt', {
      getCommanderEntryNameConflict: vi.fn(),
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderCloneEntries: vi.fn(),
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

  it('updates same-pane clone copy input and recalculates name conflicts', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'copy',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      targetPaneId: 'left',
      targetPath: '~/left',
      entryIds: ['entry-1'],
      entryNames: ['file.txt'],
      inputValue: 'file-copy.txt',
      cloneMode: 'single',
      conflictEntryNames: [],
      duplicateTargetNames: [],
      renamePreview: [],
      transferMode: 'clone',
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'file-copy-2.txt', {
      getCommanderEntryNameConflict: vi.fn(() => true),
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderCloneEntries: vi.fn(),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'copy',
      inputValue: 'file-copy-2.txt',
      cloneMode: 'single',
      conflictEntryNames: ['file-copy-2.txt'],
      duplicateTargetNames: [],
      transferMode: 'clone',
    })
  })

  it('updates same-pane batch clone copy input and recalculates template preview state', () => {
    const preview: CommanderRenamePreviewItem[] = [
      {
        entryId: 'entry-1',
        currentName: 'file-a.txt',
        nextName: 'file-a-copy.txt',
        status: 'ok',
        conflict: false,
      },
      {
        entryId: 'entry-2',
        currentName: 'file-b.txt',
        nextName: 'file-b-copy.txt',
        status: 'conflict',
        conflict: true,
      },
    ]
    const pendingOperation: CommanderPendingOperation = {
      kind: 'copy',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      targetPaneId: 'left',
      targetPath: '~/left',
      entryIds: ['entry-1', 'entry-2'],
      entryNames: ['file-a.txt', 'file-b.txt'],
      inputValue: '[N]-copy',
      cloneMode: 'batch',
      conflictEntryNames: [],
      duplicateTargetNames: [],
      renamePreview: [],
      transferMode: 'clone',
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', '[N]-copy', {
      getCommanderEntryNameConflict: vi.fn(),
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderCloneEntries: vi.fn(() => ({
        preview,
        conflictEntryNames: ['file-b-copy.txt'],
        duplicateTargetNames: ['file-a-copy.txt'],
      })),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'copy',
      inputValue: '[N]-copy',
      cloneMode: 'batch',
      conflictEntryNames: ['file-b-copy.txt'],
      duplicateTargetNames: ['file-a-copy.txt'],
      renamePreview: preview,
      transferMode: 'clone',
    })
  })

  it('no-ops when input updates are requested for operations without an input contract', () => {
    const pendingOperation: CommanderPendingOperation = {
      kind: 'copy',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      targetPaneId: 'right',
      targetPath: '~/right',
      entryIds: ['entry-1'],
      entryNames: ['file.txt'],
      conflictEntryNames: ['file.txt'],
      transferMode: 'pane',
    }
    const widgetState = createWidgetState(pendingOperation)

    const nextWidgetState = updateCommanderPendingOperationInput(widgetState, 'widget-1', 'new-target', {
      getCommanderEntryNameConflict: vi.fn(),
      getCommanderMaskMatches: vi.fn(),
      getCommanderFilterMatches: vi.fn(),
      getCommanderSearchMatches: vi.fn(),
      getCommanderResolvedSearchMatchIndex: vi.fn(),
      previewCommanderCloneEntries: vi.fn(),
      previewCommanderRenameEntries: vi.fn(),
    })

    expect(nextWidgetState).toBeNull()
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
      conflictEntryNames: [],
      transferMode: 'pane',
    }
    const widgetState = createWidgetState(pendingOperation)
    const deps = createConfirmationDeps()

    const nextWidgetState = confirmCommanderWidgetPendingOperation(widgetState, 'widget-1', deps)

    expect(nextWidgetState).toBeNull()
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

describe('requestCommanderWidgetPendingOperation', () => {
  it('opens a mkdir pending operation without requiring a selected entry', () => {
    const nextWidgetState = requestCommanderWidgetPendingOperation(createWidgetState(null), 'mkdir')

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'mkdir',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      inputValue: 'New folder',
    })
  })

  it('returns null when the pending operation cannot be created', () => {
    const deps = createPendingRequestDeps()
    deps.createPendingOperation.mockReturnValue(null)

    expect(requestCommanderWidgetPendingOperation(createWidgetState(null), 'copy', deps)).toBeNull()
  })

  it('attaches the created pending operation to the widget state', () => {
    const widgetState = createWidgetState(null)
    const deps = createPendingRequestDeps()
    deps.createPendingOperation.mockReturnValue({
      kind: 'filter',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: '*.ts',
      matchCount: 0,
      matchPreview: [],
    })

    const nextWidgetState = requestCommanderWidgetPendingOperation(widgetState, 'filter', deps)

    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'filter',
      inputValue: '*.ts',
    })
  })

  it('creates a same-pane clone copy operation with an inline target name', () => {
    const baseState = createWidgetState(null)
    const widgetState = {
      ...baseState,
      leftPane: {
        ...baseState.leftPane,
        path: '/repo/tmp',
        directoryEntries: [sampleFileEntry],
        entries: [sampleFileEntry],
        cursorEntryId: sampleFileEntry.id,
      },
      rightPane: {
        ...baseState.rightPane,
        path: '/repo/tmp',
        directoryEntries: [sampleFileEntry],
        entries: [sampleFileEntry],
      },
    } satisfies CommanderWidgetRuntimeState

    expect(createPendingOperation(widgetState, 'copy')).toMatchObject({
      kind: 'copy',
      sourcePaneId: 'left',
      targetPaneId: 'left',
      targetPath: '/repo/tmp',
      inputValue: 'README-copy.md',
      cloneMode: 'single',
      transferMode: 'clone',
    })
  })

  it('creates a same-pane batch clone copy operation with a template preview', () => {
    const alphaEntry = {
      ...sampleFileEntry,
      id: '/repo/tmp::alpha.md',
      name: 'alpha.md',
    }
    const betaEntry = {
      ...sampleFileEntry,
      id: '/repo/tmp::beta.md',
      name: 'beta.md',
    }
    const baseState = createWidgetState(null)
    const widgetState = {
      ...baseState,
      leftPane: {
        ...baseState.leftPane,
        path: '/repo/tmp',
        directoryEntries: [alphaEntry, betaEntry],
        entries: [alphaEntry, betaEntry],
        cursorEntryId: alphaEntry.id,
        selectedIds: [alphaEntry.id, betaEntry.id],
      },
      rightPane: {
        ...baseState.rightPane,
        path: '/repo/tmp',
        directoryEntries: [alphaEntry, betaEntry],
        entries: [alphaEntry, betaEntry],
      },
    } satisfies CommanderWidgetRuntimeState

    expect(createPendingOperation(widgetState, 'copy')).toMatchObject({
      kind: 'copy',
      sourcePaneId: 'left',
      targetPaneId: 'left',
      targetPath: '/repo/tmp',
      inputValue: '[N]-copy',
      cloneMode: 'batch',
      conflictEntryNames: [],
      duplicateTargetNames: [],
      renamePreview: [
        expect.objectContaining({ currentName: 'alpha.md', nextName: 'alpha-copy.md', status: 'ok' }),
        expect.objectContaining({ currentName: 'beta.md', nextName: 'beta-copy.md', status: 'ok' }),
      ],
      transferMode: 'clone',
    })
  })
})

describe('stepCommanderWidgetPendingSearchMatch', () => {
  it('returns null when search stepping is requested outside an active search flow', () => {
    expect(stepCommanderWidgetPendingSearchMatch(createWidgetState(null), 1)).toBeNull()
  })

  it('returns null when no visible matches remain', () => {
    const widgetState = createWidgetState({
      kind: 'search',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: 'match',
      matchCount: 0,
      matchPreview: [],
      matchIndex: 0,
    })
    const deps = createPendingSearchStepDeps()
    deps.getCommanderSearchMatches.mockReturnValue({
      entryIds: [],
      entryNames: [],
    })

    expect(stepCommanderWidgetPendingSearchMatch(widgetState, 1, deps)).toBeNull()
  })

  it('moves the cursor to the next search hit and updates search metadata', () => {
    const widgetState = createWidgetState({
      kind: 'search',
      sourcePaneId: 'left',
      sourcePath: '~/left',
      entryIds: [],
      entryNames: [],
      inputValue: 'match',
      matchCount: 3,
      matchPreview: ['match-1.txt'],
      matchIndex: 0,
    })
    const deps = createPendingSearchStepDeps()

    const nextWidgetState = stepCommanderWidgetPendingSearchMatch(widgetState, 1, deps)

    expect(nextWidgetState?.leftPane.cursorEntryId).toBe('match-2')
    expect(nextWidgetState?.leftPane.selectionAnchorEntryId).toBe('match-2')
    expect(nextWidgetState?.pendingOperation).toMatchObject({
      kind: 'search',
      matchCount: 3,
      matchPreview: ['match-1.txt', 'match-2.txt', 'match-3.txt'],
      matchIndex: 1,
    })
  })
})
