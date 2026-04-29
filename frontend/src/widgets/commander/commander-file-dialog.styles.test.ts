import { describe, expect, it } from 'vitest'

import * as fileDialogStyles from './commander-file-dialog.styles'

describe('commander file dialog styles', () => {
  it('routes dialog colors through commander semantic tokens', () => {
    expect(JSON.stringify(fileDialogStyles)).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/)
  })
})
