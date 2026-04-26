import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'

vi.mock('@/features/agent/model/use-agent-provider-settings', () => ({
  useAgentProviderSettings: () => ({
    availableModels: ['gpt-5.4'],
    catalog: {
      active_provider_id: 'codex-cli',
      providers: [
        {
          id: 'codex-cli',
          kind: 'codex',
          display_name: 'Codex CLI',
          enabled: true,
          active: true,
          codex: {
            command: 'codex',
            model: 'gpt-5.4',
            chat_models: ['gpt-5.4'],
          },
          created_at: '2026-04-26T10:00:00Z',
          updated_at: '2026-04-26T10:00:00Z',
        },
      ],
      supported_kinds: ['codex', 'claude', 'openai-compatible'],
    },
    draft: {
      id: 'codex-cli',
      mode: 'existing',
      kind: 'codex',
      displayName: 'Codex CLI',
      enabled: true,
      codex: {
        command: 'codex',
        model: 'gpt-5.4',
      },
      claude: {
        command: '',
        model: '',
      },
      openAICompatible: {
        baseURL: '',
        model: '',
      },
    },
    errorMessage: null,
    gateway: {
      generated_at: '2026-04-26T10:20:00Z',
      providers: [
        {
          provider_id: 'codex-cli',
          provider_kind: 'codex',
          display_name: 'Codex CLI',
          enabled: true,
          active: true,
          route_ready: true,
          route_status_state: 'ready',
          route_status_message: 'Codex CLI route is reachable.',
          resolved_binary: '/usr/local/bin/codex',
          model: 'gpt-5.4',
          route_checked_at: '2026-04-26T10:21:00Z',
          route_latency_ms: 48,
          total_runs: 3,
          succeeded_runs: 2,
          failed_runs: 1,
          cancelled_runs: 0,
          average_duration_ms: 420,
          last_duration_ms: 380,
          last_status: 'failed',
          last_error_code: 'provider_error',
          last_error_message: 'upstream timeout',
          last_started_at: '2026-04-26T10:19:00Z',
          last_completed_at: '2026-04-26T10:19:00.380Z',
        },
      ],
      recent_runs: [
        {
          id: 'provider-run-1',
          provider_id: 'codex-cli',
          provider_kind: 'codex',
          provider_display_name: 'Codex CLI',
          request_mode: 'stream',
          model: 'gpt-5.4',
          conversation_id: 'conv-1',
          status: 'failed',
          error_code: 'provider_error',
          error_message: 'upstream timeout',
          duration_ms: 380,
          started_at: '2026-04-26T10:19:00Z',
          completed_at: '2026-04-26T10:19:00.380Z',
        },
      ],
    },
    gatewayErrorMessage: 'gateway route unavailable',
    isLoading: false,
    isLoadingModels: false,
    isProbing: false,
    isSaving: false,
    modelErrorMessage: null,
    probeErrorMessage: null,
    selectedProvider: {
      id: 'codex-cli',
      kind: 'codex',
      display_name: 'Codex CLI',
      enabled: true,
      active: true,
      codex: {
        command: 'codex',
        model: 'gpt-5.4',
        chat_models: ['gpt-5.4'],
      },
      created_at: '2026-04-26T10:00:00Z',
      updated_at: '2026-04-26T10:00:00Z',
    },
    selectedProviderID: 'codex-cli',
    setDraft: vi.fn(),
    statusMessage: null,
    activateSelectedProvider: vi.fn(),
    probeSelectedProvider: vi.fn(),
    refreshAvailableModels: vi.fn(),
    removeSelectedProvider: vi.fn(),
    resetDraft: vi.fn(),
    saveDraft: vi.fn(),
    selectProvider: vi.fn(),
    startCreateProvider: vi.fn(),
  }),
}))

describe('AgentProviderSettingsWidget', () => {
  it('renders gateway telemetry and recent provider activity', () => {
    render(<AgentProviderSettingsWidget embedded />)

    expect(screen.getByText('Gateway signals')).toBeVisible()
    expect(screen.getByText('Recent provider activity')).toBeVisible()
    expect(screen.getByText('Last error: upstream timeout')).toBeVisible()
    expect(screen.getByText(/Gateway telemetry is unavailable:/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Probe provider route' })).toBeVisible()
    expect(screen.getAllByText('Codex CLI route is reachable.')).toHaveLength(2)
    expect(screen.getByText(/Codex CLI · Failing/)).toBeVisible()
    expect(screen.getByText(/stream · gpt-5.4 · 380ms/)).toBeVisible()
  })
})
