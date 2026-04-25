import { useCallback, useEffect, useSyncExternalStore } from 'react'

import {
  clampTerminalFontSize,
  clampTerminalLineHeight,
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_TERMINAL_LINE_HEIGHT,
  MAX_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_LINE_HEIGHT,
  MIN_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_LINE_HEIGHT,
  requestTerminalSettings,
  updateTerminalSettings,
} from '@/shared/api/terminal-settings'

export {
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_TERMINAL_LINE_HEIGHT,
  MAX_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_LINE_HEIGHT,
  MIN_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_LINE_HEIGHT,
}

const subscribers = new Set<() => void>()
let loadPromise: Promise<void> | null = null

type TerminalPreferencesState = {
  errorMessage: string | null
  fontSize: number
  lineHeight: number
  isLoading: boolean
  isSaving: boolean
}

let terminalPreferencesState: TerminalPreferencesState = {
  errorMessage: null,
  fontSize: DEFAULT_TERMINAL_FONT_SIZE,
  lineHeight: DEFAULT_TERMINAL_LINE_HEIGHT,
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
      fontSize: settings.font_size,
      lineHeight: settings.line_height,
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

async function persistTerminalSettings(next: { fontSize: number; lineHeight: number }) {
  terminalPreferencesState = {
    ...terminalPreferencesState,
    errorMessage: null,
    isSaving: true,
  }
  emitTerminalPreferenceChange()

  try {
    const settings = await updateTerminalSettings({
      font_size: clampTerminalFontSize(next.fontSize),
      line_height: clampTerminalLineHeight(next.lineHeight),
    })
    terminalPreferencesState = {
      ...terminalPreferencesState,
      fontSize: settings.font_size,
      lineHeight: settings.line_height,
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
    fontSize,
    lineHeight: terminalPreferencesState.lineHeight,
  })
}

export async function setTerminalLineHeight(lineHeight: number) {
  await persistTerminalSettings({
    fontSize: terminalPreferencesState.fontSize,
    lineHeight,
  })
}

export function resetTerminalPreferencesForTests() {
  terminalPreferencesState = {
    errorMessage: null,
    fontSize: DEFAULT_TERMINAL_FONT_SIZE,
    lineHeight: DEFAULT_TERMINAL_LINE_HEIGHT,
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

  return {
    errorMessage: state.errorMessage,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
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
    refresh: ensureTerminalPreferencesLoaded,
  }
}
