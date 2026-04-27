import { describe, expect, it, vi } from 'vitest'

import {
  refreshActiveProviderHistoryForPanel,
  resolveActiveProviderGateway,
  selectProviderForPanel,
} from '@/features/agent/model/agent-panel-provider-runtime'

describe('agent panel provider runtime helpers', () => {
  it('resets active provider history when no provider is selected', async () => {
    const setRuns = vi.fn()
    const setTotal = vi.fn()
    const setError = vi.fn()
    const setPending = vi.fn()

    await expect(
      refreshActiveProviderHistoryForPanel(
        {
          activeProviderID: '',
          setActiveProviderHistoryError: setError,
          setActiveProviderHistoryRuns: setRuns,
          setActiveProviderHistoryTotal: setTotal,
          setIsActiveProviderHistoryPending: setPending,
        },
        {
          fetchAgentProviderGatewaySnapshot: vi.fn(),
          activateAgentProviderInCatalog: vi.fn(),
          clearAgentProviderRouteState: vi.fn(),
          directProviderChatModels: vi.fn(),
          directProviderDefaultModel: vi.fn(),
          getErrorMessage: vi.fn(),
          prewarmAgentProvider: vi.fn(),
          probeAgentProvider: vi.fn(),
          providerViewToConversationProvider: vi.fn(),
          selectPreferredChatModel: vi.fn(),
        },
      ),
    ).resolves.toEqual([])

    expect(setRuns).toHaveBeenCalledWith([])
    expect(setTotal).toHaveBeenCalledWith(0)
    expect(setError).toHaveBeenCalledWith(null)
    expect(setPending).toHaveBeenCalledWith(false)
  })

  it('switches provider via injected runtime dependencies', async () => {
    const refreshProviderGatewaySnapshot = vi.fn().mockResolvedValue(null)
    const activateAgentProviderInCatalog = vi.fn().mockResolvedValue({
      active_provider_id: 'codex',
      providers: [
        {
          id: 'codex',
          kind: 'codex',
          display_name: 'Codex CLI',
          enabled: true,
          active: true,
          access: { owner_username: 'avm' },
          created_by: { username: 'avm' },
          updated_by: { username: 'avm' },
          route_policy: {},
          codex: {
            model: 'gpt-5',
            chat_models: ['gpt-5', 'gpt-5-mini'],
          },
          created_at: '2026-04-27T10:00:00Z',
          updated_at: '2026-04-27T10:00:00Z',
        },
      ],
      supported_kinds: ['codex'],
      current_actor: { username: 'avm' },
    })
    const setProvider = vi.fn()
    const setSelectedProviderID = vi.fn()
    const setAvailableModels = vi.fn()
    const setSelectedModel = vi.fn()
    const setProviderCatalog = vi.fn()
    const setLoadError = vi.fn()
    const setSubmitError = vi.fn()

    await selectProviderForPanel(
      {
        beginPanelStateEpoch: () => 2,
        getPanelStateEpoch: () => 2,
        provider: {
          kind: 'codex',
          base_url: 'codex',
          model: 'gpt-5-mini',
          streaming: true,
        },
        providerID: 'codex',
        refreshProviderGatewaySnapshot,
        selectedProviderID: 'claude',
        setAvailableModels,
        setLoadError,
        setProvider,
        setProviderCatalog,
        setSelectedModel,
        setSelectedProviderID,
        setSubmitError,
      },
      {
        activateAgentProviderInCatalog,
        clearAgentProviderRouteState: vi.fn(),
        directProviderChatModels: vi.fn().mockReturnValue(['gpt-5', 'gpt-5-mini']),
        directProviderDefaultModel: vi.fn().mockReturnValue('gpt-5'),
        fetchAgentProviderGatewaySnapshot: vi.fn(),
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        prewarmAgentProvider: vi.fn(),
        probeAgentProvider: vi.fn(),
        providerViewToConversationProvider: vi.fn().mockReturnValue({
          kind: 'codex',
          base_url: 'codex',
          model: 'gpt-5',
          streaming: false,
        }),
        selectPreferredChatModel: vi.fn().mockReturnValue('gpt-5'),
      },
    )

    expect(activateAgentProviderInCatalog).toHaveBeenCalledWith('codex')
    expect(setLoadError).toHaveBeenCalledWith(null)
    expect(setSubmitError).toHaveBeenCalledWith(null)
    expect(setProviderCatalog).toHaveBeenCalled()
    expect(setSelectedProviderID).toHaveBeenCalledWith('codex')
    expect(setAvailableModels).toHaveBeenCalledWith(['gpt-5', 'gpt-5-mini'])
    expect(setSelectedModel).toHaveBeenCalledWith('gpt-5')
    expect(setProvider).toHaveBeenCalledWith({
      kind: 'codex',
      base_url: 'codex',
      model: 'gpt-5',
      streaming: false,
    })
    expect(refreshProviderGatewaySnapshot).toHaveBeenCalledWith({ suppressError: true })
  })

  it('resolves the active gateway provider by explicit id or active flag', () => {
    const snapshot = {
      generated_at: '2026-04-27T10:00:00Z',
      providers: [
        {
          provider_id: 'claude',
          active: false,
        },
        {
          provider_id: 'codex',
          active: true,
        },
      ],
      recent_runs: [],
      recent_runs_total: 0,
      recent_runs_offset: 0,
      recent_runs_limit: 3,
      recent_runs_has_more: false,
    }

    expect(resolveActiveProviderGateway(snapshot as never, 'claude')?.provider_id).toBe('claude')
    expect(resolveActiveProviderGateway(snapshot as never, '')?.provider_id).toBe('codex')
    expect(resolveActiveProviderGateway(null, 'codex')).toBeNull()
  })
})
