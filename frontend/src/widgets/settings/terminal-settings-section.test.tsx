import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { TerminalSettingsSection } from '@/widgets/settings/terminal-settings-section'

vi.mock('@/features/i18n/model/locale-provider', () => ({
  useAppLocale: vi.fn(),
}))

vi.mock('@/features/terminal/model/use-terminal-preferences', async () => {
  return {
    DEFAULT_TERMINAL_CURSOR_BLINK: true,
    DEFAULT_TERMINAL_CURSOR_STYLE: 'block',
    DEFAULT_TERMINAL_FONT_SIZE: 13,
    DEFAULT_TERMINAL_LINE_HEIGHT: 1.25,
    DEFAULT_TERMINAL_SCROLLBACK: 5000,
    DEFAULT_TERMINAL_THEME_MODE: 'adaptive',
    MAX_TERMINAL_FONT_SIZE: 16,
    MAX_TERMINAL_LINE_HEIGHT: 1.6,
    MAX_TERMINAL_SCROLLBACK: 20000,
    MIN_TERMINAL_FONT_SIZE: 11,
    MIN_TERMINAL_LINE_HEIGHT: 1.05,
    MIN_TERMINAL_SCROLLBACK: 1000,
    useTerminalPreferences: vi.fn(),
  }
})

describe('TerminalSettingsSection', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  function mockLocale(locale: 'en' | 'ru' | 'zh-CN' | 'es' = 'en') {
    vi.mocked(useAppLocale).mockReturnValue({
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      locale,
      refresh: vi.fn(),
      setLocale: vi.fn(),
      supportedLocales: ['en', 'ru', 'zh-CN', 'es'],
    })
  }

  function mockTerminalPreferences(overrides: Partial<ReturnType<typeof useTerminalPreferences>> = {}) {
    const preferences: ReturnType<typeof useTerminalPreferences> = {
      decreaseFontSize: vi.fn(async () => undefined),
      decreaseLineHeight: vi.fn(async () => undefined),
      cursorBlink: true,
      cursorStyle: 'block',
      errorMessage: null,
      fontSize: 13,
      increaseFontSize: vi.fn(async () => undefined),
      increaseLineHeight: vi.fn(async () => undefined),
      increaseScrollback: vi.fn(async () => undefined),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetAllDefaults: vi.fn(async () => undefined),
      resetScrollback: vi.fn(async () => undefined),
      resetFontSize: vi.fn(async () => undefined),
      resetLineHeight: vi.fn(async () => undefined),
      resetCursorBlink: vi.fn(async () => undefined),
      resetCursorStyle: vi.fn(async () => undefined),
      resetThemeMode: vi.fn(async () => undefined),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(async () => undefined),
      updateCursorBlink: vi.fn(async () => undefined),
      updateFontSize: vi.fn(async () => undefined),
      updateLineHeight: vi.fn(async () => undefined),
      updateCursorStyle: vi.fn(async () => undefined),
      updateThemeMode: vi.fn(async () => undefined),
      ...overrides,
    }

    vi.mocked(useTerminalPreferences).mockReturnValue(preferences)
    return preferences
  }

  it('renders the current runtime-owned terminal typography controls', () => {
    mockLocale('en')
    mockTerminalPreferences()

    render(<TerminalSettingsSection />)

    expect(screen.getByText('13px')).toBeVisible()
    expect(screen.getByText('1.25x')).toBeVisible()
    expect(screen.getByText('5000 lines')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Terminal theme mode' })).toHaveValue('adaptive')
    expect(screen.getByRole('combobox', { name: 'Terminal cursor style' })).toHaveValue('block')
    expect(screen.getByRole('checkbox', { name: 'Enable terminal cursor blink' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Increase terminal font size' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset all terminal defaults' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset terminal font size' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease terminal font size' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Increase terminal scrollback' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset terminal scrollback' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease terminal scrollback' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset terminal theme mode' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset terminal cursor style' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset terminal cursor blink' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase terminal line height' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset terminal line height' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease terminal line height' })).toBeEnabled()
    expect(screen.getByText(/runtime-owned terminal defaults/i)).toBeVisible()
  })

  it('renders terminal settings copy from the active app locale', () => {
    mockLocale('ru')
    mockTerminalPreferences()

    render(<TerminalSettingsSection />)

    expect(screen.getByText('Настройки терминала по умолчанию')).toBeVisible()
    expect(screen.getByText('Текущий размер шрифта терминала')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Режим темы терминала' })).toHaveValue('adaptive')
    expect(screen.getByRole('checkbox', { name: 'Включить мигание курсора терминала' })).toBeChecked()
    expect(screen.queryByText('Terminal runtime defaults')).not.toBeInTheDocument()
  })

  it('enables the one-shot reset button when terminal settings drift from defaults', () => {
    const resetAllDefaults = vi.fn(async () => undefined)
    mockLocale('en')
    mockTerminalPreferences({
      fontSize: 14,
      resetAllDefaults,
    })

    render(<TerminalSettingsSection />)

    const resetButton = screen.getByRole('button', { name: 'Reset all terminal defaults' })
    expect(resetButton).toBeEnabled()

    fireEvent.click(resetButton)
    expect(resetAllDefaults).toHaveBeenCalledTimes(1)
  })
})
