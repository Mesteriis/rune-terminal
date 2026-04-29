import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppThemeProvider, useAppTheme } from './theme-provider'

function installMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQueryList = {
    matches,
    media: '(prefers-color-scheme: light)',
    onchange: null,
    addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQueryList),
  )

  return {
    emit(nextMatches: boolean) {
      mediaQueryList.matches = nextMatches
      listeners.forEach((listener) =>
        listener({
          matches: nextMatches,
          media: mediaQueryList.media,
        } as MediaQueryListEvent),
      )
    },
  }
}

function ThemeProbe() {
  const { resolvedTheme, setThemePreference, themePreference } = useAppTheme()

  return (
    <div>
      <span>{`${themePreference}/${resolvedTheme}`}</span>
      <button onClick={() => setThemePreference('light')} type="button">
        Light
      </button>
      <button onClick={() => setThemePreference('dark')} type="button">
        Dark
      </button>
      <button onClick={() => setThemePreference('system')} type="button">
        System
      </button>
    </div>
  )
}

describe('AppThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-runa-theme')
    document.documentElement.removeAttribute('data-runa-resolved-theme')
    document.documentElement.style.colorScheme = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('projects the persisted theme preference onto the document root', async () => {
    installMatchMedia(false)
    localStorage.setItem('rterm.app-theme', 'light')

    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('light/light')).toBeInTheDocument()
      expect(document.documentElement.dataset.runaTheme).toBe('light')
      expect(document.documentElement.dataset.runaResolvedTheme).toBe('light')
      expect(document.documentElement.style.colorScheme).toBe('light')
    })
  })

  it('keeps system theme in sync with prefers-color-scheme changes', async () => {
    const media = installMatchMedia(false)

    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('system/dark')).toBeInTheDocument()
    })

    media.emit(true)

    await waitFor(() => {
      expect(screen.getByText('system/light')).toBeInTheDocument()
      expect(document.documentElement.dataset.runaTheme).toBe('system')
      expect(document.documentElement.dataset.runaResolvedTheme).toBe('light')
    })
  })

  it('persists explicit theme preference changes', async () => {
    installMatchMedia(false)

    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Light' }))

    await waitFor(() => {
      expect(screen.getByText('light/light')).toBeInTheDocument()
      expect(localStorage.getItem('rterm.app-theme')).toBe('light')
      expect(document.documentElement.dataset.runaResolvedTheme).toBe('light')
    })
  })
})
