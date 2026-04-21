import { describe, expect, it } from 'vitest'

import {
  getCommanderConflictingEntryNames,
  getCommanderEntryNameConflict,
  previewCommanderRenameEntries,
  suggestCommanderCloneName,
} from '@/features/commander/model/operation-preview'
import type {
  CommanderDirectoryEntry,
  CommanderPaneId,
  CommanderPaneRuntimeState,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

function createEntry(
  directoryPath: string,
  name: string,
  kind: CommanderDirectoryEntry['kind'] = 'file',
): CommanderDirectoryEntry {
  const extensionIndex = name.lastIndexOf('.')

  return {
    id: `${directoryPath}::${name}`,
    name,
    ext: kind === 'file' && extensionIndex > 0 ? name.slice(extensionIndex + 1) : '',
    kind,
    sizeLabel: kind === 'file' ? '1 B' : '',
    sizeBytes: kind === 'file' ? 1 : null,
    modified: '2026-04-21 10:00',
    hidden: false,
  }
}

function createPaneState(
  paneId: CommanderPaneId,
  path: string,
  entryNames: Array<{ kind?: CommanderDirectoryEntry['kind']; name: string }>,
): CommanderPaneRuntimeState {
  const directoryEntries = entryNames.map((entry) => createEntry(path, entry.name, entry.kind ?? 'file'))

  return {
    id: paneId,
    path,
    filterQuery: '',
    directoryEntries,
    entries: directoryEntries,
    cursorEntryId: directoryEntries[0]?.id ?? null,
    selectionAnchorEntryId: directoryEntries[0]?.id ?? null,
    selectedIds: [],
    historyBack: [],
    historyForward: [],
    isLoading: false,
    errorMessage: null,
  }
}

function createWidgetState(): CommanderWidgetRuntimeState {
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
    pendingOperation: null,
    fileDialog: null,
    leftPane: createPaneState('left', '/repo/src', [
      { kind: 'folder', name: 'docs' },
      { name: 'README.md' },
      { name: 'notes.txt' },
    ]),
    rightPane: createPaneState('right', '/repo/dst', [
      { kind: 'folder', name: 'docs' },
      { name: 'README.md' },
      { name: 'summary.txt' },
    ]),
  }
}

describe('operation-preview', () => {
  it('detects transfer conflicts against the opposite pane state', () => {
    const widgetState = createWidgetState()

    expect(
      getCommanderConflictingEntryNames(widgetState, 'left', [
        '/repo/src::docs',
        '/repo/src::README.md',
        '/repo/src::notes.txt',
      ]),
    ).toEqual(['docs', 'README.md'])
  })

  it('ignores the current entry when checking a single rename conflict', () => {
    const paneState = createWidgetState().leftPane

    expect(getCommanderEntryNameConflict(paneState, 'README.md', '/repo/src::README.md')).toBe(false)
    expect(getCommanderEntryNameConflict(paneState, 'notes.txt', '/repo/src::README.md')).toBe(true)
  })

  it('marks duplicate batch rename targets in the preview', () => {
    const paneState = createPaneState('left', '/repo/src', [{ name: 'README.md' }, { name: 'notes.md' }])

    const preview = previewCommanderRenameEntries(
      paneState,
      ['/repo/src::README.md', '/repo/src::notes.md'],
      'docs',
    )

    expect(preview.duplicateTargetNames).toEqual(['docs.md'])
    expect(preview.conflictEntryNames).toEqual([])
    expect(preview.preview).toEqual([
      expect.objectContaining({ currentName: 'README.md', nextName: 'docs.md', status: 'duplicate' }),
      expect.objectContaining({ currentName: 'notes.md', nextName: 'docs.md', status: 'duplicate' }),
    ])
  })

  it('marks existing directory conflicts in the preview', () => {
    const paneState = createPaneState('left', '/repo/src', [
      { kind: 'folder', name: 'alpha' },
      { kind: 'folder', name: 'docs' },
    ])

    const preview = previewCommanderRenameEntries(paneState, ['/repo/src::alpha'], 'docs')

    expect(preview.duplicateTargetNames).toEqual([])
    expect(preview.conflictEntryNames).toEqual(['docs'])
    expect(preview.preview).toEqual([
      expect.objectContaining({ currentName: 'alpha', nextName: 'docs', status: 'conflict' }),
    ])
  })

  it('suggests the next available same-pane clone name', () => {
    const paneState = createPaneState('left', '/repo/src', [
      { name: 'README.md' },
      { name: 'README-copy.md' },
      { name: 'README-copy-2.md' },
    ])

    expect(suggestCommanderCloneName(paneState, '/repo/src::README.md')).toBe('README-copy-3.md')
  })
})
