import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_TERMINAL_CURSOR_BLINK,
  DEFAULT_TERMINAL_CURSOR_STYLE,
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_TERMINAL_LINE_HEIGHT,
  DEFAULT_TERMINAL_SCROLLBACK,
  DEFAULT_TERMINAL_THEME_MODE,
  MAX_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_LINE_HEIGHT,
  MAX_TERMINAL_SCROLLBACK,
  MIN_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_LINE_HEIGHT,
  MIN_TERMINAL_SCROLLBACK,
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
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.fontSize).toBe(DEFAULT_TERMINAL_FONT_SIZE)
    expect(result.current.lineHeight).toBe(DEFAULT_TERMINAL_LINE_HEIGHT)
    expect(result.current.scrollback).toBe(DEFAULT_TERMINAL_SCROLLBACK)
    expect(result.current.themeMode).toBe(DEFAULT_TERMINAL_THEME_MODE)
    expect(result.current.cursorStyle).toBe(DEFAULT_TERMINAL_CURSOR_STYLE)
    expect(result.current.cursorBlink).toBe(DEFAULT_TERMINAL_CURSOR_BLINK)
  })

  it('persists font-size updates through the backend contract', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })
    vi.mocked(updateTerminalSettings).mockResolvedValue({
      font_size: 15,
      line_height: 1.3,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: 'contrast',
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
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
    expect(result.current.scrollback).toBe(DEFAULT_TERMINAL_SCROLLBACK)
    expect(result.current.themeMode).toBe('contrast')
    expect(result.current.cursorStyle).toBe(DEFAULT_TERMINAL_CURSOR_STYLE)
    expect(result.current.cursorBlink).toBe(DEFAULT_TERMINAL_CURSOR_BLINK)
    expect(updateTerminalSettings).toHaveBeenCalledWith({
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      font_size: 15,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
    })
  })

  it('clamps terminal font size updates into the supported range', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })
    vi.mocked(updateTerminalSettings)
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
        font_size: MAX_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
        scrollback: DEFAULT_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      })
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
        font_size: MIN_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
        scrollback: DEFAULT_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
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
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })
    vi.mocked(updateTerminalSettings)
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: MAX_TERMINAL_LINE_HEIGHT,
        scrollback: DEFAULT_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      })
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: MIN_TERMINAL_LINE_HEIGHT,
        scrollback: DEFAULT_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
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

  it('persists terminal theme mode updates through the backend contract', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })
    vi.mocked(updateTerminalSettings).mockResolvedValue({
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: 'contrast',
    })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateThemeMode('contrast')
    })

    expect(result.current.themeMode).toBe('contrast')
    expect(updateTerminalSettings).toHaveBeenCalledWith({
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: 'contrast',
    })
  })

  it('clamps terminal scrollback updates into the supported range', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })
    vi.mocked(updateTerminalSettings)
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
        scrollback: MAX_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      })
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
        scrollback: MIN_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateScrollback(999999)
    })

    expect(result.current.scrollback).toBe(MAX_TERMINAL_SCROLLBACK)

    await act(async () => {
      await result.current.updateScrollback(1)
    })

    expect(result.current.scrollback).toBe(MIN_TERMINAL_SCROLLBACK)
  })

  it('persists terminal cursor behavior through the backend contract', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })
    vi.mocked(updateTerminalSettings)
      .mockResolvedValueOnce({
        cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
        cursor_style: 'bar',
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
        scrollback: DEFAULT_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      })
      .mockResolvedValueOnce({
        cursor_blink: false,
        cursor_style: 'bar',
        font_size: DEFAULT_TERMINAL_FONT_SIZE,
        line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
        scrollback: DEFAULT_TERMINAL_SCROLLBACK,
        theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateCursorStyle('bar')
    })

    expect(result.current.cursorStyle).toBe('bar')
    expect(updateTerminalSettings).toHaveBeenNthCalledWith(1, {
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
      cursor_style: 'bar',
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
    })

    await act(async () => {
      await result.current.updateCursorBlink(false)
    })

    expect(result.current.cursorBlink).toBe(false)
    expect(updateTerminalSettings).toHaveBeenNthCalledWith(2, {
      cursor_blink: false,
      cursor_style: 'bar',
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
    })
  })

  it('restores all terminal defaults through the shared backend contract', async () => {
    vi.mocked(requestTerminalSettings).mockResolvedValue({
      font_size: 15,
      line_height: 1.35,
      scrollback: 7000,
      theme_mode: 'contrast',
      cursor_style: 'underline',
      cursor_blink: false,
    })
    vi.mocked(updateTerminalSettings).mockResolvedValue({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
    })

    const { result } = renderHook(() => useTerminalPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.resetAllDefaults()
    })

    expect(result.current.fontSize).toBe(DEFAULT_TERMINAL_FONT_SIZE)
    expect(result.current.lineHeight).toBe(DEFAULT_TERMINAL_LINE_HEIGHT)
    expect(result.current.scrollback).toBe(DEFAULT_TERMINAL_SCROLLBACK)
    expect(result.current.themeMode).toBe(DEFAULT_TERMINAL_THEME_MODE)
    expect(result.current.cursorStyle).toBe(DEFAULT_TERMINAL_CURSOR_STYLE)
    expect(result.current.cursorBlink).toBe(DEFAULT_TERMINAL_CURSOR_BLINK)
    expect(updateTerminalSettings).toHaveBeenCalledWith({
      cursor_blink: DEFAULT_TERMINAL_CURSOR_BLINK,
      cursor_style: DEFAULT_TERMINAL_CURSOR_STYLE,
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      scrollback: DEFAULT_TERMINAL_SCROLLBACK,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
    })
  })
})
