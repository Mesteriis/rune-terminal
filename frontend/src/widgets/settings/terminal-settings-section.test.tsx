import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { resetTerminalPreferencesForTests } from '@/features/terminal/model/use-terminal-preferences'
import { TerminalSettingsSection } from '@/widgets/settings/terminal-settings-section'

describe('TerminalSettingsSection', () => {
  afterEach(() => {
    resetTerminalPreferencesForTests()
  })

  it('updates the visible terminal font size through the settings controls', () => {
    render(<TerminalSettingsSection />)

    expect(screen.getByText('13px')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Increase terminal font size' }))

    expect(screen.getByText('14px')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Reset terminal font size' }))

    expect(screen.getByText('13px')).toBeVisible()
  })
})
