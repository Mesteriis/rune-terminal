import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { SettingsShellWidget } from '@/widgets/settings/settings-shell-widget'

vi.mock('@/features/i18n/model/locale-provider', () => ({
  useAppLocale: vi.fn(),
}))

vi.mock('@/features/agent/model/use-agent-provider-settings', () => ({
  useAgentProviderSettings: vi.fn(),
}))

vi.mock('@/shared/model/dockview-api-registry', () => ({
  getActiveDockviewApi: vi.fn(() => null),
}))

vi.mock('@/widgets/settings/agent-provider-settings-widget', () => ({
  AgentProviderSettingsWidget: () => <div data-testid="embedded-ai-providers">provider editor</div>,
}))

vi.mock('@/widgets/settings/ai-composer-settings-section', () => ({
  AiComposerSettingsSection: () => <div>composer settings</div>,
}))

vi.mock('@/widgets/settings/mcp-settings-section', () => ({
  MCPSettingsSection: () => <div>mcp settings</div>,
}))

vi.mock('@/widgets/settings/plugins-settings-section', () => ({
  PluginsSettingsSection: () => <div>plugin settings</div>,
}))

vi.mock('@/widgets/settings/remote-profiles-settings-section', () => ({
  RemoteProfilesSettingsSection: () => <div>remote settings</div>,
}))

vi.mock('@/widgets/settings/runtime-settings-section', () => ({
  RuntimeSettingsSection: () => <div>runtime settings</div>,
}))

vi.mock('@/widgets/settings/terminal-settings-section', () => ({
  TerminalSettingsSection: () => <div>terminal settings</div>,
}))

describe('SettingsShellWidget', () => {
  it('uses concise Russian navigation copy without repeating the modal intro', () => {
    vi.mocked(useAppLocale).mockReturnValue({
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      locale: 'ru',
      refresh: vi.fn(),
      setLocale: vi.fn(),
      supportedLocales: ['en', 'ru', 'zh-CN', 'es'],
    })

    render(<SettingsShellWidget />)

    expect(screen.getByText('Разделы')).toBeVisible()
    expect(screen.getByText('Основные')).toBeVisible()
    expect(screen.getByText('Язык, тема и запуск.')).toBeVisible()
    expect(screen.getAllByText('Провайдеры AI').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Общий навигатор/)).not.toBeInTheDocument()
    expect(screen.queryByText(/settings sections/i)).not.toBeInTheDocument()
  })
})
