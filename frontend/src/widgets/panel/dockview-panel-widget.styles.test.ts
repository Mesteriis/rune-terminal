import { describe, expect, it } from 'vitest'

import { resolveDockviewPanelInnerContentStyle } from '@/widgets/panel/dockview-panel-widget.styles'

describe('resolveDockviewPanelInnerContentStyle', () => {
  it('keeps the original terminal panel inset', () => {
    expect(resolveDockviewPanelInnerContentStyle(true)).toMatchObject({
      gap: 'var(--gap-sm)',
      padding: 'calc(var(--padding-widget) / 2)',
    })
  })

  it('tightens the top seam for non-terminal panel bodies', () => {
    expect(resolveDockviewPanelInnerContentStyle(false)).toMatchObject({
      gap: 'var(--gap-xs)',
      padding: 'calc(var(--padding-widget) / 2)',
      paddingTop: '2px',
    })
  })
})
