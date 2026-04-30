import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AppThemePreference = 'system' | 'light' | 'dark'
export type AppResolvedTheme = 'light' | 'dark'

type AppThemeContextValue = {
  resolvedTheme: AppResolvedTheme
  setThemePreference: (nextPreference: AppThemePreference) => void
  themePreference: AppThemePreference
}

const THEME_STORAGE_KEY = 'rterm.app-theme'
const THEME_MEDIA_QUERY = '(prefers-color-scheme: light)'
const AppThemeContext = createContext<AppThemeContextValue | null>(null)

function normalizeThemePreference(value: unknown): AppThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function getStoredThemePreference() {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY) ?? 'dark')
  } catch {
    return 'dark'
  }
}

function persistThemePreference(preference: AppThemePreference) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Theme persistence is a UI convenience; keep the active in-memory preference if storage is blocked.
  }
}

function getSystemTheme(): AppResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'light' : 'dark'
}

function resolveTheme(preference: AppThemePreference, systemTheme: AppResolvedTheme): AppResolvedTheme {
  return preference === 'system' ? systemTheme : preference
}

function applyDocumentTheme(preference: AppThemePreference, resolvedTheme: AppResolvedTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.runaTheme = preference
  document.documentElement.dataset.runaResolvedTheme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<AppThemePreference>(() =>
    getStoredThemePreference(),
  )
  const [systemTheme, setSystemTheme] = useState<AppResolvedTheme>(() => getSystemTheme())
  const resolvedTheme = resolveTheme(themePreference, systemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
    const handleThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'light' : 'dark')
    }

    setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    mediaQuery.addEventListener('change', handleThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [])

  useEffect(() => {
    applyDocumentTheme(themePreference, resolvedTheme)
  }, [resolvedTheme, themePreference])

  const setThemePreference = useCallback((nextPreference: AppThemePreference) => {
    const normalizedPreference = normalizeThemePreference(nextPreference)
    setThemePreferenceState(normalizedPreference)
    persistThemePreference(normalizedPreference)
  }, [])

  const value = useMemo<AppThemeContextValue>(
    () => ({
      resolvedTheme,
      setThemePreference,
      themePreference,
    }),
    [resolvedTheme, setThemePreference, themePreference],
  )

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  const value = useContext(AppThemeContext)
  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider')
  }
  return value
}
