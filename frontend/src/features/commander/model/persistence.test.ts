import { beforeEach, describe, expect, it } from 'vitest'

import {
  readPersistedCommanderWidget,
  serializeCommanderWidgetRuntimeState,
  writePersistedCommanderWidgets,
} from '@/features/commander/model/persistence'
import type {
  CommanderClientEntrySnapshot,
  CommanderDirectoryEntry,
  CommanderPaneRuntimeState,
  CommanderWidgetPersistedSnapshot,
  CommanderWidgetRuntimeState,
} from '@/features/commander/model/types'

const STORAGE_KEY = 'runa-terminal:commander-widgets:v1'

const baseEntry: CommanderDirectoryEntry = {
  id: 'entry-1',
  name: 'notes.txt',
  ext: 'txt',
  kind: 'file',
  sizeLabel: '128 B',
  sizeBytes: 128,
  modified: '2026-04-20 10:30',
  hidden: false,
}

const baseClientEntry: CommanderClientEntrySnapshot = {
  name: 'notes.txt',
  ext: 'txt',
  kind: 'file',
  sizeLabel: '128 B',
  modified: '2026-04-20 10:30',
  content: 'hello',
}

function createPaneState(id: CommanderPaneRuntimeState['id']): CommanderPaneRuntimeState {
  return {
    id,
    path: id === 'left' ? '~/left' : '~/right',
    filterQuery: '',
    entries: [baseEntry],
    cursorEntryId: baseEntry.id,
    selectionAnchorEntryId: baseEntry.id,
    selectedIds: [baseEntry.id],
    historyBack: ['~'],
    historyForward: [],
  }
}

function createRuntimeState(): CommanderWidgetRuntimeState {
  return {
    widgetId: 'widget-1',
    mode: 'commander',
    viewMode: 'split',
    activePane: 'left',
    showHidden: true,
    sortMode: 'modified',
    sortDirection: 'desc',
    dirsFirst: false,
    footerHints: [{ key: 'F3', label: 'View' }],
    pendingOperation: null,
    fileDialog: null,
    leftPane: createPaneState('left'),
    rightPane: createPaneState('right'),
  }
}

function createPersistedSnapshot(): CommanderWidgetPersistedSnapshot {
  const runtime = serializeCommanderWidgetRuntimeState(createRuntimeState())

  return {
    runtime,
    client: {
      directories: {
        '~/left': [baseClientEntry],
      },
    },
  }
}

describe('commander persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('serializes only the runtime fields needed for persistence', () => {
    expect(serializeCommanderWidgetRuntimeState(createRuntimeState())).toEqual({
      activePane: 'left',
      viewMode: 'split',
      showHidden: true,
      sortMode: 'modified',
      sortDirection: 'desc',
      dirsFirst: false,
      leftPane: {
        path: '~/left',
        filterQuery: '',
        entries: [baseEntry],
        cursorEntryId: 'entry-1',
        selectionAnchorEntryId: 'entry-1',
        selectedIds: ['entry-1'],
        historyBack: ['~'],
        historyForward: [],
      },
      rightPane: {
        path: '~/right',
        filterQuery: '',
        entries: [baseEntry],
        cursorEntryId: 'entry-1',
        selectionAnchorEntryId: 'entry-1',
        selectedIds: ['entry-1'],
        historyBack: ['~'],
        historyForward: [],
      },
    })
  })

  it('round-trips persisted widgets through localStorage', () => {
    const persistedSnapshot = createPersistedSnapshot()

    writePersistedCommanderWidgets({
      'widget-1': persistedSnapshot,
    })

    expect(readPersistedCommanderWidget('widget-1')).toEqual(persistedSnapshot)
    expect(readPersistedCommanderWidget('widget-2')).toBeNull()
  })

  it('normalizes legacy persisted defaults and drops invalid widget snapshots', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        widgets: {
          'widget-1': {
            runtime: {
              activePane: 'left',
              viewMode: 'commander',
              showHidden: false,
              sortMode: 'name',
              leftPane: {
                path: '~/left',
                filterQuery: '',
                entries: [baseEntry],
                cursorEntryId: 'entry-1',
                selectedIds: ['entry-1'],
                historyBack: [],
                historyForward: [],
              },
              rightPane: {
                path: '~/right',
                filterQuery: '',
                entries: [baseEntry],
                cursorEntryId: null,
                selectedIds: [],
                historyBack: [],
                historyForward: [],
              },
            },
            client: {
              directories: {
                '~/left': [baseClientEntry],
              },
            },
          },
          broken: {
            runtime: {
              activePane: 'middle',
            },
            client: {
              directories: [],
            },
          },
        },
      }),
    )

    expect(readPersistedCommanderWidget('widget-1')).toEqual({
      runtime: {
        activePane: 'left',
        viewMode: 'commander',
        showHidden: false,
        sortMode: 'name',
        sortDirection: 'asc',
        dirsFirst: true,
        leftPane: {
          path: '~/left',
          filterQuery: '',
          entries: [baseEntry],
          cursorEntryId: 'entry-1',
          selectionAnchorEntryId: 'entry-1',
          selectedIds: ['entry-1'],
          historyBack: [],
          historyForward: [],
        },
        rightPane: {
          path: '~/right',
          filterQuery: '',
          entries: [baseEntry],
          cursorEntryId: null,
          selectionAnchorEntryId: null,
          selectedIds: [],
          historyBack: [],
          historyForward: [],
        },
      },
      client: {
        directories: {
          '~/left': [baseClientEntry],
        },
      },
    })
    expect(readPersistedCommanderWidget('broken')).toBeNull()
  })

  it('keeps legacy pane entries readable when optional entry fields are missing', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        widgets: {
          'widget-legacy': {
            runtime: {
              activePane: 'right',
              viewMode: 'split',
              showHidden: true,
              sortMode: 'size',
              leftPane: {
                path: '~/left',
                filterQuery: '',
                entries: [
                  {
                    id: 'legacy-entry',
                    name: 'archive.tar',
                    ext: 'tar',
                    kind: 'file',
                    sizeLabel: '4 KB',
                    modified: '2026-04-20 10:30',
                  },
                ],
                cursorEntryId: 'legacy-entry',
                selectedIds: ['legacy-entry'],
                historyBack: [],
                historyForward: [],
              },
              rightPane: {
                path: '~/right',
                filterQuery: '',
                entries: [],
                cursorEntryId: null,
                selectedIds: [],
                historyBack: [],
                historyForward: [],
              },
            },
            client: {
              directories: {
                '~/left': [
                  {
                    name: 'archive.tar',
                    ext: 'tar',
                    kind: 'file',
                    sizeLabel: '4 KB',
                    modified: '2026-04-20 10:30',
                  },
                ],
              },
            },
          },
        },
      }),
    )

    expect(readPersistedCommanderWidget('widget-legacy')).toEqual({
      runtime: {
        activePane: 'right',
        viewMode: 'split',
        showHidden: true,
        sortMode: 'size',
        sortDirection: 'asc',
        dirsFirst: true,
        leftPane: {
          path: '~/left',
          filterQuery: '',
          entries: [
            {
              id: 'legacy-entry',
              name: 'archive.tar',
              ext: 'tar',
              kind: 'file',
              sizeLabel: '4 KB',
              sizeBytes: null,
              modified: '2026-04-20 10:30',
              hidden: false,
            },
          ],
          cursorEntryId: 'legacy-entry',
          selectionAnchorEntryId: 'legacy-entry',
          selectedIds: ['legacy-entry'],
          historyBack: [],
          historyForward: [],
        },
        rightPane: {
          path: '~/right',
          filterQuery: '',
          entries: [],
          cursorEntryId: null,
          selectionAnchorEntryId: null,
          selectedIds: [],
          historyBack: [],
          historyForward: [],
        },
      },
      client: {
        directories: {
          '~/left': [
            {
              name: 'archive.tar',
              ext: 'tar',
              kind: 'file',
              sizeLabel: '4 KB',
              modified: '2026-04-20 10:30',
            },
          ],
        },
      },
    })
  })
})
