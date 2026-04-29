import { describe, expect, it } from 'vitest'

import * as pendingBarStyles from './commander-pending-bar.styles'
import { commanderInactivePaneStateBadgeStyle, getRenamePreviewStatusStyle } from './commander-widget.shared'

describe('commander pending styles', () => {
  it('routes visual colors through commander semantic tokens', () => {
    const serializedStyles = JSON.stringify([
      pendingBarStyles,
      commanderInactivePaneStateBadgeStyle,
      getRenamePreviewStatusStyle('duplicate'),
      getRenamePreviewStatusStyle('conflict'),
      getRenamePreviewStatusStyle('invalid'),
      getRenamePreviewStatusStyle('ok'),
    ])

    expect(serializedStyles).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/)
  })
})
