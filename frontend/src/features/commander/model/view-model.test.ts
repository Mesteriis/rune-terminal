import { describe, expect, it } from 'vitest'

import { CommanderAPIError } from '@/features/commander/api/client'
import { toLoadErrorMessage } from '@/features/commander/model/view-model'

describe('toLoadErrorMessage', () => {
  it('maps oversized inline file errors to an operator-readable message', () => {
    expect(toLoadErrorMessage(new CommanderAPIError(413, 'fs_file_too_large', 'fs file is too large'))).toBe(
      'File is too large for inline editing',
    )
  })
})
