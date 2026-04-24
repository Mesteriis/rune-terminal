import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_FONT_SIZE,
  resetTerminalPreferencesForTests,
  useTerminalPreferences,
} from '@/features/terminal/model/use-terminal-preferences'

describe('useTerminalPreferences', () => {
  afterEach(() => {
    resetTerminalPreferencesForTests()
  })

  it('returns the default terminal font size when storage is empty', () => {
    const { result } = renderHook(() => useTerminalPreferences())

    expect(result.current.fontSize).toBe(DEFAULT_TERMINAL_FONT_SIZE)
  })

  it('persists font-size updates through localStorage', () => {
    const { result, rerender } = renderHook(() => useTerminalPreferences())

    act(() => {
      result.current.updateFontSize(15)
    })

    expect(result.current.fontSize).toBe(15)

    rerender()

    expect(result.current.fontSize).toBe(15)
  })

  it('clamps terminal font size updates into the supported range', () => {
    const { result } = renderHook(() => useTerminalPreferences())

    act(() => {
      result.current.updateFontSize(99)
    })

    expect(result.current.fontSize).toBe(MAX_TERMINAL_FONT_SIZE)

    act(() => {
      result.current.updateFontSize(1)
    })

    expect(result.current.fontSize).toBe(MIN_TERMINAL_FONT_SIZE)
  })
})
