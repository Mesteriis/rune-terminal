import { describe, expect, it } from 'vitest'

import { createCommanderWidgetRuntimeState } from '@/features/commander/model/pane-state'
import type { CommanderWidgetPersistedState } from '@/features/commander/model/types'

describe('createCommanderWidgetRuntimeState', () => {
  it('uses model-owned defaults when no persisted commander state exists', () => {
    const runtimeState = createCommanderWidgetRuntimeState('widget-1')

    expect(runtimeState.dataSource).toBe('backend')
    expect(runtimeState.viewMode).toBe('commander')
    expect(runtimeState.activePane).toBe('left')
    expect(runtimeState.showHidden).toBe(true)
    expect(runtimeState.sortMode).toBe('name')
    expect(runtimeState.sortDirection).toBe('asc')
    expect(runtimeState.dirsFirst).toBe(true)
    expect(runtimeState.footerHints.map((hint) => hint.key)).toEqual([
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
      'F8',
      'CTRL+L',
      'CTRL+S',
      'CTRL+F',
      'CTRL+BS',
    ])
    expect(runtimeState.leftPane.isLoading).toBe(true)
    expect(runtimeState.rightPane.isLoading).toBe(true)
  })

  it('restores pane navigation state without reusing persisted directory entries', () => {
    const persistedState: CommanderWidgetPersistedState = {
      activePane: 'right',
      viewMode: 'split',
      showHidden: false,
      sortMode: 'modified',
      sortDirection: 'desc',
      dirsFirst: false,
      leftPane: {
        path: '~/repo/core',
        filterQuery: '*.go',
        cursorEntryId: 'core::service.go',
        selectionAnchorEntryId: 'core::service.go',
        selectedIds: ['core::service.go'],
        historyBack: ['~/repo'],
        historyForward: [],
      },
      rightPane: {
        path: '~/repo/frontend',
        filterQuery: '',
        cursorEntryId: 'frontend::App.tsx',
        selectionAnchorEntryId: 'frontend::App.tsx',
        selectedIds: ['frontend::App.tsx'],
        historyBack: ['~/repo'],
        historyForward: ['~/repo/frontend/src'],
      },
    }

    const runtimeState = createCommanderWidgetRuntimeState('widget-restore', persistedState)

    expect(runtimeState.leftPane.path).toBe('~/repo/core')
    expect(runtimeState.leftPane.filterQuery).toBe('*.go')
    expect(runtimeState.leftPane.selectedIds).toEqual(['core::service.go'])
    expect(runtimeState.leftPane.directoryEntries).toEqual([])
    expect(runtimeState.leftPane.entries).toEqual([])
    expect(runtimeState.leftPane.isLoading).toBe(true)
    expect(runtimeState.rightPane.path).toBe('~/repo/frontend')
    expect(runtimeState.rightPane.historyBack).toEqual(['~/repo'])
    expect(runtimeState.rightPane.historyForward).toEqual(['~/repo/frontend/src'])
    expect(runtimeState.rightPane.directoryEntries).toEqual([])
    expect(runtimeState.rightPane.entries).toEqual([])
    expect(runtimeState.rightPane.isLoading).toBe(true)
  })
})
