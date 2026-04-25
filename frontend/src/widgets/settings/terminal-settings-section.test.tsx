import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { TerminalSettingsSection } from '@/widgets/settings/terminal-settings-section'

vi.mock('@/features/terminal/model/use-terminal-preferences', async () => {
  return {
    DEFAULT_TERMINAL_FONT_SIZE: 13,
    MAX_TERMINAL_FONT_SIZE: 16,
    MIN_TERMINAL_FONT_SIZE: 11,
    useTerminalPreferences: vi.fn(),
  }
})

describe('TerminalSettingsSection', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the current runtime-owned terminal font size controls', () => {
    vi.mocked(useTerminalPreferences).mockReturnValue({
      decreaseFontSize: vi.fn(async () => undefined),
      errorMessage: null,
      fontSize: 13,
      increaseFontSize: vi.fn(async () => undefined),
      isLoading: false,
      isSaving: false,
      refresh: vi.fn(async () => undefined),
      resetFontSize: vi.fn(async () => undefined),
      updateFontSize: vi.fn(async () => undefined),
    })

    render(<TerminalSettingsSection />)

    expect(screen.getByText('13px')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Increase terminal font size' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset terminal font size' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease terminal font size' })).toBeEnabled()
    expect(screen.getByText(/runtime-owned terminal preference/i)).toBeVisible()
  })
})
