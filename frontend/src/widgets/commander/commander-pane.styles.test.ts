import { describe, expect, it } from 'vitest'

import * as commanderPaneStyles from './commander-pane.styles'

describe('commander pane styles', () => {
  it('routes visual colors through semantic tokens', () => {
    const serializedStyles = JSON.stringify(commanderPaneStyles)

    expect(serializedStyles).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/)
  })
})
