import { afterEach, describe, expect, it, vi } from 'vitest'

import { writeTextToClipboard } from './clipboard'

const originalClipboard = navigator.clipboard

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  })
})

describe('writeTextToClipboard', () => {
  it('writes text through the browser clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await expect(writeTextToClipboard('/repo/README.md')).resolves.toBeUndefined()

    expect(writeText).toHaveBeenCalledWith('/repo/README.md')
  })

  it('fails explicitly when the clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })

    await expect(writeTextToClipboard('/repo/README.md')).rejects.toThrow('Clipboard API is unavailable')
  })
})
