import { describe, expect, it } from 'vitest'

import { resolveDockviewHeaderActionsWrapStyle } from '@/widgets/terminal/terminal-dockview-actions.styles'

describe('resolveDockviewHeaderActionsWrapStyle', () => {
  it('keeps the terminal header actions offset for terminal groups', () => {
    expect(resolveDockviewHeaderActionsWrapStyle(true)).toMatchObject({
      height: 'calc(100% - (var(--padding-widget) / 2))',
      marginTop: 'calc(var(--padding-widget) / 2)',
    })
  })

  it('uses a flush wrap for non-terminal group actions', () => {
    expect(resolveDockviewHeaderActionsWrapStyle(false)).toMatchObject({
      height: '100%',
      marginTop: 0,
    })
  })
})
