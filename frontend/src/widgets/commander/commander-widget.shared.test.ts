import { describe, expect, it } from 'vitest'

import type { CommanderPaneRuntimeState } from '@/features/commander/model/types'
import { getCommanderPathSuggestions } from '@/widgets/commander/commander-widget.shared'

function createPaneState(): CommanderPaneRuntimeState {
  return {
    id: 'left',
    path: '/repo',
    filterQuery: '',
    directoryEntries: [
      {
        id: '/repo::frontend',
        name: 'frontend',
        ext: '',
        kind: 'folder',
        sizeLabel: '',
        sizeBytes: null,
        modified: '2026-04-25 10:00',
        hidden: false,
      },
      {
        id: '/repo::core',
        name: 'core',
        ext: '',
        kind: 'folder',
        sizeLabel: '',
        sizeBytes: null,
        modified: '2026-04-25 10:00',
        hidden: false,
      },
    ],
    entries: [],
    cursorEntryId: null,
    selectionAnchorEntryId: null,
    selectedIds: [],
    historyBack: ['/repo/tmp'],
    historyForward: [],
    isLoading: false,
    errorMessage: null,
  }
}

describe('getCommanderPathSuggestions', () => {
  it('returns matching loaded child directories for inline path autocomplete', () => {
    const paneState = createPaneState()

    const suggestions = getCommanderPathSuggestions(
      '/repo/fron',
      paneState,
      ['/repo/frontend', '/repo/core'],
      (path) => path,
    )

    expect(suggestions[0]).toEqual({
      displayPath: '/repo/frontend',
      meta: 'PATH',
      path: '/repo/frontend',
    })
  })

  it('keeps current path and history ahead of child directories when no query is provided', () => {
    const paneState = createPaneState()

    const suggestions = getCommanderPathSuggestions(
      '',
      paneState,
      ['/repo/frontend', '/repo/core'],
      (path) => path,
    )

    expect(suggestions.slice(0, 2)).toEqual([
      {
        displayPath: '/repo',
        meta: 'CURRENT',
        path: '/repo',
      },
      {
        displayPath: '/repo/tmp',
        meta: 'HISTORY',
        path: '/repo/tmp',
      },
    ])
  })
})
