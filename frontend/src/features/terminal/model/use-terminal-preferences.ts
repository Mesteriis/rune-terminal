import { useCallback, useSyncExternalStore } from 'react'

const TERMINAL_FONT_SIZE_STORAGE_KEY = 'rterm.terminal.font-size.v1'

export const DEFAULT_TERMINAL_FONT_SIZE = 13
export const MIN_TERMINAL_FONT_SIZE = 11
export const MAX_TERMINAL_FONT_SIZE = 16

const subscribers = new Set<() => void>()

function clampTerminalFontSize(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TERMINAL_FONT_SIZE
  }

  return Math.min(MAX_TERMINAL_FONT_SIZE, Math.max(MIN_TERMINAL_FONT_SIZE, Math.round(value)))
}

function emitTerminalPreferenceChange() {
  subscribers.forEach((subscriber) => subscriber())
}

function readTerminalFontSize() {
  if (typeof window === 'undefined') {
    return DEFAULT_TERMINAL_FONT_SIZE
  }

  try {
    const rawValue = window.localStorage.getItem(TERMINAL_FONT_SIZE_STORAGE_KEY)
    if (rawValue == null) {
      return DEFAULT_TERMINAL_FONT_SIZE
    }

    return clampTerminalFontSize(Number(rawValue))
  } catch {
    return DEFAULT_TERMINAL_FONT_SIZE
  }
}

function subscribeToTerminalPreferences(callback: () => void) {
  subscribers.add(callback)

  const handleStorage = (event: StorageEvent) => {
    if (event.key === TERMINAL_FONT_SIZE_STORAGE_KEY) {
      callback()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
  }

  return () => {
    subscribers.delete(callback)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage)
    }
  }
}

export function setTerminalFontSize(fontSize: number) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(TERMINAL_FONT_SIZE_STORAGE_KEY, String(clampTerminalFontSize(fontSize)))
  } catch {
    return
  }

  emitTerminalPreferenceChange()
}

export function resetTerminalPreferencesForTests() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(TERMINAL_FONT_SIZE_STORAGE_KEY)
  emitTerminalPreferenceChange()
}

export function useTerminalPreferences() {
  const fontSize = useSyncExternalStore(
    subscribeToTerminalPreferences,
    readTerminalFontSize,
    () => DEFAULT_TERMINAL_FONT_SIZE,
  )

  const updateFontSize = useCallback((value: number) => {
    setTerminalFontSize(value)
  }, [])

  const increaseFontSize = useCallback(() => {
    setTerminalFontSize(fontSize + 1)
  }, [fontSize])

  const decreaseFontSize = useCallback(() => {
    setTerminalFontSize(fontSize - 1)
  }, [fontSize])

  const resetFontSize = useCallback(() => {
    setTerminalFontSize(DEFAULT_TERMINAL_FONT_SIZE)
  }, [])

  return {
    fontSize,
    updateFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  }
}
