import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_TERMINAL_LINE_HEIGHT,
  MAX_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_LINE_HEIGHT,
  MIN_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_LINE_HEIGHT,
  resetTerminalPreferencesForTests,
  useTerminalPreferences,
} from '@/features/terminal/model/use-terminal-preferences'
import { requestTerminalSettings, updateTerminalSettings } from '@/shared/api/terminal-settings'

vi.mock('@/shared/api/terminal-settings', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/terminal-settings')>(
    '@/shared/api/terminal-settings',
  )

  return {
    ...actual,
    requestTerminalSettings: vi.fn(),
    updateTerminalSettings: vi.fn(),
  }
})

describe('useTerminalPreferences', () => {
  afterEach(() => {
    resetTerminalPreferencesForTests()
    vi.clearAllMocks()
  })

  it('loads the terminal font size from the backend contract', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
    })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.fontSize).toBe(DEFAULT_TERMINAL_FONT_SIZE)
    expect(result.current.lineHeight).toBe(DEFAULT_TERMINAL_LINE_HEIGHT)
  })

  it('persists font-size updates through the backend contract', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
    })
    vi.mocked(updateTerminalSettings).mockResolvedValue({
      font_size: 15,
      line_height: 1.3,
    })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateFontSize(15)
    })

    expect(result.current.fontSize).toBe(15)
    expect(result.current.lineHeight).toBe(1.3)
    expect(updateTerminalSettings).toHaveBeenCalledWith({
      font_size: 15,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
    })
  })

  it('clamps terminal font size updates into the supported range', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
    })
    vi.mocked(updateTerminalSettings)
      .mockResolvedValueOnce({
        font_size: MAX_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      })
      .mockResolvedValueOnce({
        font_size: MIN_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateFontSize(99)
    })

    expect(result.current.fontSize).toBe(MAX_TERMINAL_FONT_SIZE)

    await act(async () => {
      await result.current.updateFontSize(1)
    })

    expect(result.current.fontSize).toBe(MIN_TERMINAL_FONT_SIZE)
  })

  it('clamps terminal line-height updates into the supported range', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
    })
    vi.mocked(updateTerminalSettings)
      .mockResolvedValueOnce({
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: MAX_TERMINAL_LINE_HEIGHT,
      })
      .mockResolvedValueOnce({
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: MIN_TERMINAL_LINE_HEIGHT,
      })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateLineHeight(9)
    })

    expect(result.current.lineHeight).toBe(MAX_TERMINAL_LINE_HEIGHT)

    await act(async () => {
      await result.current.updateLineHeight(0.2)
    })

    expect(result.current.lineHeight).toBe(MIN_TERMINAL_LINE_HEIGHT)
  })
})
