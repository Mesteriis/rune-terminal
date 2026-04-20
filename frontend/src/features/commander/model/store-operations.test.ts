import { describe, expect, it, vi } from 'vitest'

import { updateCommanderPendingOperationInput } from '@/features/commander/model/store-operations'
import type {
  CommanderPendingOperation,
  CommanderRenamePreviewItem,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

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
