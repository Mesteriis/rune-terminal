import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useRuntimeSettings } from '@/features/runtime/model/use-runtime-settings'
import { useWindowTitleSettings } from '@/features/runtime/model/use-window-title-settings'
import { RuntimeSettingsSection } from './runtime-settings-section'

vi.mock('@/features/i18n/model/locale-provider', () => ({
  useAppLocale: vi.fn(),
}))

vi.mock('@/features/runtime/model/use-runtime-settings', () => ({
  useRuntimeSettings: vi.fn(),
}))

vi.mock('@/features/runtime/model/use-window-title-settings', () => ({
  useWindowTitleSettings: vi.fn(),
}))

describe('RuntimeSettingsSection', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders runtime lifecycle and window title controls', () => {
    vi.mocked(useAppLocale).mockReturnValue({
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      locale: 'en',
      refresh: vi.fn(),
      setLocale: vi.fn(),
      supportedLocales: ['en', 'ru', 'zh-CN', 'es'],
    })
    vi.mocked(useRuntimeSettings).mockReturnValue({
      canPersistWatcherMode: true,
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      refresh: vi.fn(),
      runtimeContext: {
        authToken: 'token',
        baseUrl: 'http://127.0.0.1:8090',
        colorTerm: 'truecolor',
        defaultShell: '/bin/zsh',
        homeDir: '/Users/avm',
        repoRoot: '/repo',
        term: 'xterm-256color',
      },
      updateWatcherMode: vi.fn(),
      watcherMode: 'ephemeral',
    })
    vi.mocked(useWindowTitleSettings).mockReturnValue({
      autoTitle: 'Workspace-2',
      customTitle: 'Ops Shell',
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      mode: 'custom',
      refresh: vi.fn(),
      updateSettings: vi.fn(),
    })

    render(<RuntimeSettingsSection />)

    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Window title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ops Shell')).toBeInTheDocument()
    expect(screen.getByText('Auto preview: Workspace-2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save custom title' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset to auto' })).toBeEnabled()
  })

  it('saves and resets custom title through the runtime-backed hook', async () => {
    const updateSettings = vi.fn().mockResolvedValue(undefined)
    const setLocale = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppLocale).mockReturnValue({
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      locale: 'en',
      refresh: vi.fn(),
      setLocale,
      supportedLocales: ['en', 'ru', 'zh-CN', 'es'],
    })
    vi.mocked(useRuntimeSettings).mockReturnValue({
      canPersistWatcherMode: true,
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      refresh: vi.fn(),
      runtimeContext: null,
      updateWatcherMode: vi.fn(),
      watcherMode: 'ephemeral',
    })
    vi.mocked(useWindowTitleSettings).mockReturnValue({
      autoTitle: 'Workspace-2',
      customTitle: 'Ops Shell',
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      mode: 'custom',
      refresh: vi.fn(),
      updateSettings,
    })

    render(<RuntimeSettingsSection />)

    fireEvent.click(screen.getByLabelText('Русский'))

    await waitFor(() => {
      expect(setLocale).toHaveBeenCalledWith('ru')
    })

    fireEvent.change(screen.getByRole('textbox', { name: 'Custom window title' }), {
      target: { value: 'Prod Window' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save custom title' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        customTitle: 'Prod Window',
        mode: 'custom',
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset to auto' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        mode: 'auto',
      })
    })
  })
})
