import { describe, expect, it } from 'vitest'

import { createPreviewPanelParams, isPreviewPanelParams, resolvePreviewPanelParams } from './preview-panel'

describe('preview panel params', () => {
  it('creates stable preview panel params from a backend widget result', () => {
    expect(
      createPreviewPanelParams({
        path: '/repo/README.md',
        widgetId: 'preview-1',
      }),
    ).toEqual({
      component: 'preview',
      path: '/repo/README.md',
      title: 'README.md',
      widgetId: 'preview-1',
    })
  })

  it('guards preview panel params from generic Dockview panel params', () => {
    const params = createPreviewPanelParams({
      connectionId: 'local',
      path: '/repo/package.json',
      title: 'Package',
      widgetId: 'preview-package',
    })

    expect(isPreviewPanelParams(params)).toBe(true)
    expect(resolvePreviewPanelParams(params)).toEqual(params)
    expect(resolvePreviewPanelParams({ component: 'files' })).toBeNull()
  })
})
