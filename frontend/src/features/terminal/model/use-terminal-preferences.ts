import { useCallback, useEffect, useSyncExternalStore } from 'react'

import {
  clampTerminalCursorStyle,
  clampTerminalFontSize,
  clampTerminalLineHeight,
  clampTerminalScrollback,
  clampTerminalThemeMode,
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
  type TerminalCursorStyle,
  type TerminalThemeMode,
  requestTerminalSettings,
  updateTerminalSettings,
} from '@/shared/api/terminal-settings'

export {
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
}

const subscribers = new Set<() => void>()
let loadPromise: Promise<void> | null = null

type TerminalPreferencesState = {
  cursorBlink: boolean
  cursorStyle: TerminalCursorStyle
  errorMessage: string | null
  fontSize: number
  lineHeight: number
  scrollback: number
  themeMode: TerminalThemeMode
  isLoading: boolean
  isSaving: boolean
}

let terminalPreferencesState: TerminalPreferencesState = {
  cursorBlink: DEFAULT_TERMINAL_CURSOR_BLINK,
  cursorStyle: DEFAULT_TERMINAL_CURSOR_STYLE,
  errorMessage: null,
  fontSize: DEFAULT_TERMINAL_FONT_SIZE,
  lineHeight: DEFAULT_TERMINAL_LINE_HEIGHT,
  scrollback: DEFAULT_TERMINAL_SCROLLBACK,
  themeMode: DEFAULT_TERMINAL_THEME_MODE,
  isLoading: true,
  isSaving: false,
}

function emitTerminalPreferenceChange() {
  subscribers.forEach((subscriber) => subscriber())
}

function formatTerminalPreferencesError(error: unknown) {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return 'Unable to load terminal settings.'
}

async function refreshTerminalPreferences() {
  terminalPreferencesState = {
    ...terminalPreferencesState,
    errorMessage: null,
    isLoading: true,
  }
  emitTerminalPreferenceChange()

  try {
    const settings = await requestTerminalSettings()
    terminalPreferencesState = {
      ...terminalPreferencesState,
      cursorBlink: settings.cursor_blink,
      cursorStyle: settings.cursor_style,
      fontSize: settings.font_size,
      lineHeight: settings.line_height,
      scrollback: settings.scrollback,
      themeMode: settings.theme_mode,
    }
  } catch (error) {
    terminalPreferencesState = {
      ...terminalPreferencesState,
      errorMessage: formatTerminalPreferencesError(error),
    }
  } finally {
    terminalPreferencesState = {
      ...terminalPreferencesState,
      isLoading: false,
    }
    emitTerminalPreferenceChange()
  }
}

function ensureTerminalPreferencesLoaded() {
  if (!loadPromise) {
    loadPromise = refreshTerminalPreferences().finally(() => {
      loadPromise = null
    })
  }

  return loadPromise
}

function subscribeToTerminalPreferences(callback: () => void) {
  subscribers.add(callback)

  return () => {
    subscribers.delete(callback)
  }
}

function getTerminalPreferencesSnapshot() {
  return terminalPreferencesState
}

async function persistTerminalSettings(next: {
  cursorBlink: boolean
  cursorStyle: TerminalCursorStyle
  fontSize: number
  lineHeight: number
  scrollback: number
  themeMode: TerminalThemeMode
}) {
  terminalPreferencesState = {
    ...terminalPreferencesState,
    errorMessage: null,
    isSaving: true,
  }
  emitTerminalPreferenceChange()

  try {
    const settings = await updateTerminalSettings({
      cursor_blink: next.cursorBlink,
      cursor_style: clampTerminalCursorStyle(next.cursorStyle),
      font_size: clampTerminalFontSize(next.fontSize),
      line_height: clampTerminalLineHeight(next.lineHeight),
      scrollback: clampTerminalScrollback(next.scrollback),
      theme_mode: clampTerminalThemeMode(next.themeMode),
    })
    terminalPreferencesState = {
      ...terminalPreferencesState,
      cursorBlink: settings.cursor_blink,
      cursorStyle: settings.cursor_style,
      fontSize: settings.font_size,
      lineHeight: settings.line_height,
      scrollback: settings.scrollback,
      themeMode: settings.theme_mode,
    }
  } catch (error) {
    terminalPreferencesState = {
      ...terminalPreferencesState,
      errorMessage: formatTerminalPreferencesError(error),
    }
  } finally {
    terminalPreferencesState = {
      ...terminalPreferencesState,
      isSaving: false,
    }
    emitTerminalPreferenceChange()
  }
}

export async function setTerminalFontSize(fontSize: number) {
  await persistTerminalSettings({
    cursorBlink: terminalPreferencesState.cursorBlink,
    cursorStyle: terminalPreferencesState.cursorStyle,
    fontSize,
    lineHeight: terminalPreferencesState.lineHeight,
    scrollback: terminalPreferencesState.scrollback,
    themeMode: terminalPreferencesState.themeMode,
  })
}

export async function setTerminalLineHeight(lineHeight: number) {
  await persistTerminalSettings({
    cursorBlink: terminalPreferencesState.cursorBlink,
    cursorStyle: terminalPreferencesState.cursorStyle,
    fontSize: terminalPreferencesState.fontSize,
    lineHeight,
    scrollback: terminalPreferencesState.scrollback,
    themeMode: terminalPreferencesState.themeMode,
  })
}

export async function setTerminalScrollback(scrollback: number) {
  await persistTerminalSettings({
    cursorBlink: terminalPreferencesState.cursorBlink,
    cursorStyle: terminalPreferencesState.cursorStyle,
    fontSize: terminalPreferencesState.fontSize,
    lineHeight: terminalPreferencesState.lineHeight,
    scrollback,
    themeMode: terminalPreferencesState.themeMode,
  })
}

export async function setTerminalThemeMode(themeMode: TerminalThemeMode) {
  await persistTerminalSettings({
    cursorBlink: terminalPreferencesState.cursorBlink,
    cursorStyle: terminalPreferencesState.cursorStyle,
    fontSize: terminalPreferencesState.fontSize,
    lineHeight: terminalPreferencesState.lineHeight,
    scrollback: terminalPreferencesState.scrollback,
    themeMode,
  })
}

export async function setTerminalCursorStyle(cursorStyle: TerminalCursorStyle) {
  await persistTerminalSettings({
    cursorBlink: terminalPreferencesState.cursorBlink,
    cursorStyle,
    fontSize: terminalPreferencesState.fontSize,
    lineHeight: terminalPreferencesState.lineHeight,
    scrollback: terminalPreferencesState.scrollback,
    themeMode: terminalPreferencesState.themeMode,
  })
}

export async function setTerminalCursorBlink(cursorBlink: boolean) {
  await persistTerminalSettings({
    cursorBlink,
    cursorStyle: terminalPreferencesState.cursorStyle,
    fontSize: terminalPreferencesState.fontSize,
    lineHeight: terminalPreferencesState.lineHeight,
    scrollback: terminalPreferencesState.scrollback,
    themeMode: terminalPreferencesState.themeMode,
  })
}

export function resetTerminalPreferencesForTests() {
  terminalPreferencesState = {
    cursorBlink: DEFAULT_TERMINAL_CURSOR_BLINK,
    cursorStyle: DEFAULT_TERMINAL_CURSOR_STYLE,
    errorMessage: null,
    fontSize: DEFAULT_TERMINAL_FONT_SIZE,
    lineHeight: DEFAULT_TERMINAL_LINE_HEIGHT,
    scrollback: DEFAULT_TERMINAL_SCROLLBACK,
    themeMode: DEFAULT_TERMINAL_THEME_MODE,
    isLoading: true,
    isSaving: false,
  }
  loadPromise = null
  emitTerminalPreferenceChange()
}

export function useTerminalPreferences() {
  const state = useSyncExternalStore(
    subscribeToTerminalPreferences,
    getTerminalPreferencesSnapshot,
    getTerminalPreferencesSnapshot,
  )

  useEffect(() => {
    void ensureTerminalPreferencesLoaded()
  }, [])

  const updateFontSize = useCallback(async (value: number) => {
    await setTerminalFontSize(value)
  }, [])

  const increaseFontSize = useCallback(async () => {
    await setTerminalFontSize(state.fontSize + 1)
  }, [state.fontSize])

  const decreaseFontSize = useCallback(async () => {
    await setTerminalFontSize(state.fontSize - 1)
  }, [state.fontSize])

  const resetFontSize = useCallback(async () => {
    await setTerminalFontSize(DEFAULT_TERMINAL_FONT_SIZE)
  }, [])

  const updateLineHeight = useCallback(async (value: number) => {
    await setTerminalLineHeight(value)
  }, [])

  const increaseLineHeight = useCallback(async () => {
    await setTerminalLineHeight(state.lineHeight + 0.05)
  }, [state.lineHeight])

  const decreaseLineHeight = useCallback(async () => {
    await setTerminalLineHeight(state.lineHeight - 0.05)
  }, [state.lineHeight])

  const resetLineHeight = useCallback(async () => {
    await setTerminalLineHeight(DEFAULT_TERMINAL_LINE_HEIGHT)
  }, [])

  const updateScrollback = useCallback(async (value: number) => {
    await setTerminalScrollback(value)
  }, [])

  const increaseScrollback = useCallback(async () => {
    await setTerminalScrollback(state.scrollback + 1000)
  }, [state.scrollback])

  const decreaseScrollback = useCallback(async () => {
    await setTerminalScrollback(state.scrollback - 1000)
  }, [state.scrollback])

  const resetScrollback = useCallback(async () => {
    await setTerminalScrollback(DEFAULT_TERMINAL_SCROLLBACK)
  }, [])

  const updateThemeMode = useCallback(async (value: TerminalThemeMode) => {
    await setTerminalThemeMode(value)
  }, [])

  const resetThemeMode = useCallback(async () => {
    await setTerminalThemeMode(DEFAULT_TERMINAL_THEME_MODE)
  }, [])

  const updateCursorStyle = useCallback(async (value: TerminalCursorStyle) => {
    await setTerminalCursorStyle(value)
  }, [])

  const resetCursorStyle = useCallback(async () => {
    await setTerminalCursorStyle(DEFAULT_TERMINAL_CURSOR_STYLE)
  }, [])

  const updateCursorBlink = useCallback(async (value: boolean) => {
    await setTerminalCursorBlink(value)
  }, [])

  const resetCursorBlink = useCallback(async () => {
    await setTerminalCursorBlink(DEFAULT_TERMINAL_CURSOR_BLINK)
  }, [])

  return {
    cursorBlink: state.cursorBlink,
    cursorStyle: state.cursorStyle,
    errorMessage: state.errorMessage,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    scrollback: state.scrollback,
    themeMode: state.themeMode,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    updateFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    updateLineHeight,
    increaseLineHeight,
    decreaseLineHeight,
    resetLineHeight,
    updateScrollback,
    increaseScrollback,
    decreaseScrollback,
    resetScrollback,
    updateThemeMode,
    resetThemeMode,
    updateCursorStyle,
    resetCursorStyle,
    updateCursorBlink,
    resetCursorBlink,
    refresh: ensureTerminalPreferencesLoaded,
  }
}
