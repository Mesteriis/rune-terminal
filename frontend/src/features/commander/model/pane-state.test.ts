import { describe, expect, it } from 'vitest'

import { createCommanderWidgetRuntimeState } from '@/features/commander/model/pane-state'

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
})
