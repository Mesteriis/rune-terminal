import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'

const setHistoryQuery = vi.fn()
const setHistoryStatus = vi.fn()
const setHistoryScope = vi.fn()
const setHistoryLimit = vi.fn()
const clearSelectedProviderRouteState = vi.fn()
const loadMoreHistory = vi.fn()

vi.mock('@/features/agent/model/use-agent-provider-settings', () => ({
  useAgentProviderSettings: () => ({
    availableModels: ['gpt-5.4'],
    catalog: {
      current_actor: {
        username: 'avm',
        home_dir: '/Users/avm',
      },
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
          access: {
            owner_username: 'avm',
            visibility: 'private',
            allowed_users: [],
          },
          created_by: {
            username: 'avm',
            home_dir: '/Users/avm',
          },
          updated_by: {
            username: 'avm',
            home_dir: '/Users/avm',
          },
          route_policy: {
            prewarm_policy: 'manual',
            warm_ttl_seconds: 900,
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
      ownerUsername: 'avm',
      visibility: 'private',
      allowedUsers: '',
      prewarmPolicy: 'manual',
      warmTTLSeconds: 900,
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
          route_prepared: false,
          route_prepare_state: 'stale',
          route_prepare_message: 'Route should be prepared again.',
          route_prepared_at: '2026-04-26T10:20:30Z',
          route_prepare_latency_ms: 0,
          route_prepare_expires_at: '2026-04-26T10:35:30Z',
          route_prepare_stale: true,
          route_prewarm_policy: 'manual',
          route_warm_ttl_seconds: 900,
          total_runs: 3,
          succeeded_runs: 2,
          failed_runs: 1,
          cancelled_runs: 0,
          average_duration_ms: 420,
          average_first_response_latency_ms: 110,
          last_duration_ms: 380,
          last_first_response_latency_ms: 84,
          last_status: 'failed',
          last_error_code: 'timeout',
          last_error_message: 'upstream timeout',
          last_started_at: '2026-04-26T10:19:00Z',
          last_completed_at: '2026-04-26T10:19:00.380Z',
        },
      ],
      recent_runs: [],
      recent_runs_total: 0,
      recent_runs_offset: 0,
      recent_runs_limit: 20,
      recent_runs_has_more: false,
    },
    gatewayErrorMessage: 'gateway route unavailable',
    historyHasMore: true,
    historyErrorMessage: null,
    historyLimit: 20,
    historyOffset: 0,
    historyQuery: 'timeout',
    historyRuns: [
      {
        id: 'provider-run-1',
        provider_id: 'codex-cli',
        provider_kind: 'codex',
        provider_display_name: 'Codex CLI',
        actor_username: 'avm',
        actor_home_dir: '/Users/avm',
        request_mode: 'stream',
        model: 'gpt-5.4',
        conversation_id: 'conv-1',
        status: 'failed',
        error_code: 'timeout',
        error_message: 'upstream timeout',
        route_ready: true,
        route_status_state: 'ready',
        route_status_message: 'Codex CLI route is reachable.',
        route_prepared: false,
        route_prepare_state: 'stale',
        route_prepare_message: 'Route should be prepared again.',
        resolved_binary: '/usr/local/bin/codex',
        base_url: '',
        duration_ms: 380,
        first_response_latency_ms: 84,
        started_at: '2026-04-26T10:19:00Z',
        completed_at: '2026-04-26T10:19:00.380Z',
      },
      {
        id: 'provider-run-2',
        provider_id: 'claude-cli',
        provider_kind: 'claude',
        provider_display_name: 'Claude Code CLI',
        actor_username: 'avm',
        actor_home_dir: '/Users/avm',
        request_mode: 'sync',
        model: 'sonnet',
        conversation_id: 'conv-2',
        status: 'succeeded',
        error_code: '',
        error_message: '',
        route_ready: true,
        route_status_state: 'ready',
        route_status_message: 'Claude route is reachable.',
        route_prepared: true,
        route_prepare_state: 'prepared',
        route_prepare_message: 'Prepared.',
        resolved_binary: '/usr/local/bin/claude',
        base_url: '',
        duration_ms: 240,
        first_response_latency_ms: 56,
        started_at: '2026-04-26T10:18:00Z',
        completed_at: '2026-04-26T10:18:00.240Z',
      },
    ],
    historyScope: 'selected',
    historyStatus: 'failed',
    historyTotal: 42,
    isHistoryLoading: false,
    isLoading: false,
    isLoadingModels: false,
    isPreparing: false,
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
      access: {
        owner_username: 'avm',
        visibility: 'private',
        allowed_users: [],
      },
      created_by: {
        username: 'avm',
        home_dir: '/Users/avm',
      },
      updated_by: {
        username: 'avm',
        home_dir: '/Users/avm',
      },
      route_policy: {
        prewarm_policy: 'manual',
        warm_ttl_seconds: 900,
      },
      created_at: '2026-04-26T10:00:00Z',
      updated_at: '2026-04-26T10:00:00Z',
    },
    selectedProviderID: 'codex-cli',
    setDraft: vi.fn(),
    setHistoryLimit,
    setHistoryQuery,
    setHistoryScope,
    setHistoryStatus,
    statusMessage: null,
    activateSelectedProvider: vi.fn(),
    clearSelectedProviderRouteState,
    loadMoreHistory,
    providerGatewayHistoryPageOptions: [10, 20, 50],
    prewarmSelectedProvider: vi.fn(),
    probeSelectedProvider: vi.fn(),
    refreshAvailableModels: vi.fn(),
    reloadCatalog: vi.fn(),
    removeSelectedProvider: vi.fn(),
    resetDraft: vi.fn(),
    saveDraft: vi.fn(),
    selectProvider: vi.fn(),
    startCreateProvider: vi.fn(),
    updateProviderChatModels: vi.fn(),
  }),
}))

describe('AgentProviderSettingsWidget', () => {
  it('renders gateway telemetry and backend-filtered provider activity controls', () => {
    render(<AgentProviderSettingsWidget embedded />)

    expect(screen.getByText('Gateway signals')).toBeVisible()
    expect(screen.getByText('Recent provider activity')).toBeVisible()
    expect(screen.getByText('Last error (Timed out): upstream timeout')).toBeVisible()
    expect(screen.getByText(/Gateway telemetry is unavailable:/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Probe provider route' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Retry route prepare' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Clear route state' })).toBeVisible()
    expect(screen.getAllByText('Codex CLI route is reachable.')).toHaveLength(2)
    expect(screen.getByText(/Codex CLI · Failing/)).toBeVisible()
    expect(screen.getByText(/Created by avm · updated by avm/)).toBeVisible()
    expect(screen.getByText(/Showing 2 of 42 persisted runs/)).toBeVisible()
    expect(screen.getByText(/stream · gpt-5.4 · 380ms · first response 84ms/)).toBeVisible()
    expect(screen.queryByText('Run diagnostics')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Provider scope'), {
      target: { value: 'all' },
    })
    fireEvent.change(screen.getByLabelText('History search'), {
      target: { value: 'claude' },
    })
    fireEvent.change(screen.getByLabelText('Status filter'), {
      target: { value: 'succeeded' },
    })
    fireEvent.change(screen.getByLabelText('History window'), {
      target: { value: '50' },
    })

    expect(setHistoryScope).toHaveBeenCalledWith('all')
    expect(setHistoryQuery).toHaveBeenCalledWith('claude')
    expect(setHistoryStatus).toHaveBeenCalledWith('succeeded')
    expect(setHistoryLimit).toHaveBeenCalledWith(50)

    fireEvent.click(screen.getByText(/Claude Code CLI · Healthy/))
    expect(screen.getByText('Run diagnostics')).toBeVisible()
    expect(screen.getByText('Claude Code CLI')).toBeVisible()
    expect(screen.getByText('56ms')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Load more history' }))
    expect(loadMoreHistory).toHaveBeenCalled()
  })

  it('renders provider routing chrome through the active locale copy', () => {
    render(<AgentProviderSettingsWidget embedded locale="ru" />)

    expect(screen.queryByText('AI / Провайдеры')).not.toBeInTheDocument()
    expect(screen.getByText('Настроенные провайдеры')).toBeVisible()
    expect(screen.getByText('Состояние маршрута')).toBeVisible()
    expect(screen.getByText('Недавняя активность провайдера')).toBeVisible()
    expect(screen.queryByText('Диагностика запуска')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Проверить маршрут провайдера' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Повторить подготовку маршрута' })).toBeVisible()
    expect(screen.getByText('Маршрут нужно подготовить снова.')).toBeVisible()
    expect(screen.getByText(/stream · gpt-5.4 · 380ms · первый ответ 84ms/)).toBeVisible()
    expect(screen.getByLabelText('Поиск истории')).toHaveValue('timeout')

    fireEvent.click(screen.getByText(/Claude Code CLI · Работает/))
    expect(screen.getByText('Диагностика запуска')).toBeVisible()
    expect(screen.getByText('Диалог')).toBeVisible()
    expect(screen.queryByText('Conversation')).not.toBeInTheDocument()
    expect(screen.queryByText('Актор')).not.toBeInTheDocument()
    expect(screen.queryByText('Resolved route')).not.toBeInTheDocument()
    expect(screen.queryByText('Сигналы gateway')).not.toBeInTheDocument()
  })
})
