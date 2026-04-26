import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useWindowTitleSync } from './use-window-title-sync'

describe('useWindowTitleSync', () => {
  const originalTitle = document.title

  afterEach(() => {
    document.title = originalTitle
  })

  it('derives auto title from the active workspace tab', () => {
    renderHook(() =>
      useWindowTitleSync({
        activeWorkspaceId: 2,
        autoTitle: 'Backend Workspace',
        customTitle: '',
        mode: 'auto',
        workspaceTabs: [
          { id: 1, title: 'Workspace-1', snapshot: null },
          { id: 2, title: 'Workspace-2', snapshot: null },
        ],
      }),
    )

    expect(document.title).toBe('Workspace-2 · RunaTerminal')
  })

  it('prefers custom titles over auto title', () => {
    renderHook(() =>
      useWindowTitleSync({
        activeWorkspaceId: 2,
        autoTitle: 'Backend Workspace',
        customTitle: 'Ops Shell',
        mode: 'custom',
        workspaceTabs: [{ id: 2, title: 'Workspace-2', snapshot: null }],
      }),
    )

    expect(document.title).toBe('Ops Shell')
  })
})
