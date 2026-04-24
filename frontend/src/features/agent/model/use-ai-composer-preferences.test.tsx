import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  resetAiComposerPreferencesForTests,
  useAiComposerPreferences,
} from '@/features/agent/model/use-ai-composer-preferences'

describe('useAiComposerPreferences', () => {
  afterEach(() => {
    resetAiComposerPreferencesForTests()
  })

  it('defaults to enter-sends when no preference is stored', () => {
    const { result } = renderHook(() => useAiComposerPreferences())

    expect(result.current.submitMode).toBe('enter-sends')
  })

  it('persists and rehydrates submit mode changes', () => {
    const { result, rerender } = renderHook(() => useAiComposerPreferences())

    act(() => {
      result.current.updateSubmitMode('mod-enter-sends')
    })

    expect(result.current.submitMode).toBe('mod-enter-sends')

    rerender()

    expect(result.current.submitMode).toBe('mod-enter-sends')
  })
})
