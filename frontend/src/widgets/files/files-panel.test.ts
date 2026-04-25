import { describe, expect, it } from 'vitest'

import { createFilesPanelParams, isFilesPanelParams, resolveFilesPanelParams } from './files-panel'

describe('files panel params', () => {
  it('creates stable files panel params from a backend widget result', () => {
    expect(
      createFilesPanelParams({
        path: '/repo',
        widgetId: 'files-1',
      }),
    ).toEqual({
      component: 'files',
      path: '/repo',
      title: 'repo',
      widgetId: 'files-1',
    })
  })

  it('guards files panel params from generic Dockview panel params', () => {
    const params = createFilesPanelParams({
      connectionId: 'local',
      path: '/',
      title: 'Root',
      widgetId: 'files-root',
    })

    expect(isFilesPanelParams(params)).toBe(true)
    expect(resolveFilesPanelParams(params)).toEqual(params)
    expect(resolveFilesPanelParams({ component: 'commander' })).toBeNull()
  })
})
