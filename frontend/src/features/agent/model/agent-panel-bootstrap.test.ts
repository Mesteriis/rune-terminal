import { describe, expect, it, vi } from 'vitest'

import {
  bootstrapAgentPanel,
  resetAgentPanelBootstrapState,
  resetAgentPanelRuntime,
} from '@/features/agent/model/agent-panel-bootstrap'

describe('agent panel bootstrap helpers', () => {
  it('resets runtime resources and unblocks the widget', () => {
    const clearActiveAuditMessageID = vi.fn()
    const clearPendingFlowRef = vi.fn()
    const closeActiveStream = vi.fn()
    const resetContextRuntime = vi.fn()
    const setIsResponseCancellable = vi.fn()
    const unblockAiWidget = vi.fn()

    resetAgentPanelRuntime({
      clearActiveAuditMessageID,
      clearPendingFlowRef,
      closeActiveStream,
      resetContextRuntime,
      setIsResponseCancellable,
      unblockAiWidget,
    })

    expect(closeActiveStream).toHaveBeenCalledOnce()
    expect(clearActiveAuditMessageID).toHaveBeenCalledOnce()
    expect(clearPendingFlowRef).toHaveBeenCalledOnce()
    expect(resetContextRuntime).toHaveBeenCalledOnce()
    expect(setIsResponseCancellable).toHaveBeenCalledWith(false)
    expect(unblockAiWidget).toHaveBeenCalledOnce()
  })

  it('resets bootstrap state back to panel defaults', () => {
    const setConversationCounts = vi.fn()
    const setProviderGatewayPending = vi.fn()

    resetAgentPanelBootstrapState({
      defaultConversationListCounts: { recent: 0, archived: 0, all: 0 },
      setActiveConversationID: vi.fn(),
      setActiveConversationSummary: vi.fn(),
      setActiveProviderHistoryError: vi.fn(),
      setActiveProviderHistoryRuns: vi.fn(),
      setActiveProviderHistoryTotal: vi.fn(),
      setAgentCatalog: vi.fn(),
      setAvailableModels: vi.fn(),
      setContextWidgetLoadError: vi.fn(),
      setContextWidgetOptions: vi.fn(),
      setConversationCounts,
      setConversationScope: vi.fn(),
      setConversations: vi.fn(),
      setDraft: vi.fn(),
      setInteractionMessages: vi.fn(),
      setIsActiveProviderHistoryPending: vi.fn(),
      setIsAttachmentLibraryPending: vi.fn(),
      setIsConversationListPending: vi.fn(),
      setIsConversationPending: vi.fn(),
      setIsProviderGatewayPending: setProviderGatewayPending,
      setIsProviderRoutePreparing: vi.fn(),
      setIsProviderRouteProbing: vi.fn(),
      setIsSubmitting: vi.fn(),
      setIsWidgetContextEnabled: vi.fn(),
      setLoadError: vi.fn(),
      setMessages: vi.fn(),
      setMissingContextWidgetCount: vi.fn(),
      setPendingFlow: vi.fn(),
      setProvider: vi.fn(),
      setProviderCatalog: vi.fn(),
      setProviderGateway: vi.fn(),
      setProviderGatewayError: vi.fn(),
      setRecentAttachmentReferences: vi.fn(),
      setSelectedModel: vi.fn(),
      setSelectedProviderID: vi.fn(),
      setStoredContextWidgetIDs: vi.fn(),
      setSubmitError: vi.fn(),
      setWorkspaceActiveWidgetID: vi.fn(),
    })

    expect(setConversationCounts).toHaveBeenCalledWith({ recent: 0, archived: 0, all: 0 })
    expect(setProviderGatewayPending).toHaveBeenCalledWith(true)
  })

  it('bootstraps provider selection and gateway snapshot from runtime data', async () => {
    const applyConversationSnapshot = vi.fn()
    const setProviderCatalog = vi.fn()
    const setSelectedProviderID = vi.fn()
    const setAvailableModels = vi.fn()
    const setSelectedModel = vi.fn((updater: (currentModel: string) => string) => updater(''))
    const setProviderGateway = vi.fn()
    const setProviderGatewayError = vi.fn()
    const setAgentCatalog = vi.fn()
    const setRecentAttachmentReferences = vi.fn()
    const setLoadError = vi.fn()

    await bootstrapAgentPanel(
      {
        applyConversationSnapshot,
        getPanelStateEpoch: () => 5,
        hostId: 'ai-main',
        panelStateEpoch: 5,
        setAgentCatalog,
        setAvailableModels,
        setLoadError,
        setProviderCatalog,
        setProviderGateway,
        setProviderGatewayError,
        setRecentAttachmentReferences,
        setSelectedModel,
        setSelectedProviderID,
      },
      {
        directProviderChatModels: vi.fn().mockReturnValue(['gpt-5', 'gpt-5-mini']),
        directProviderDefaultModel: vi.fn().mockReturnValue('gpt-5'),
        fetchAgentAttachmentReferences: vi.fn().mockResolvedValue([{ id: 'att-1' }]),
        fetchAgentCatalog: vi.fn().mockResolvedValue({ profiles: [], roles: [], modes: [], active: {} }),
        fetchAgentConversation: vi.fn().mockResolvedValue({
          id: 'conv-1',
          title: 'Conversation',
          messages: [],
          provider: { kind: 'codex', base_url: 'codex', model: 'gpt-5', streaming: true },
          context_preferences: { widget_context_enabled: true, widget_ids: [] },
          created_at: '2026-04-27T12:00:00Z',
          updated_at: '2026-04-27T12:00:00Z',
        }),
        fetchAgentProviderCatalog: vi.fn().mockResolvedValue({
          active_provider_id: 'codex',
          current_actor: { username: 'avm' },
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
              codex: { model: 'gpt-5', chat_models: ['gpt-5', 'gpt-5-mini'] },
              created_at: '2026-04-27T12:00:00Z',
              updated_at: '2026-04-27T12:00:00Z',
            },
          ],
          supported_kinds: ['codex'],
        }),
        fetchAgentProviderGatewaySnapshot: vi.fn().mockResolvedValue({
          generated_at: '2026-04-27T12:00:00Z',
          providers: [],
          recent_runs: [],
          recent_runs_total: 0,
          recent_runs_offset: 0,
          recent_runs_limit: 3,
          recent_runs_has_more: false,
        }),
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        selectPreferredChatModel: vi.fn().mockReturnValue('gpt-5'),
      },
    )

    expect(applyConversationSnapshot).toHaveBeenCalledOnce()
    expect(setProviderCatalog).toHaveBeenCalledOnce()
    expect(setSelectedProviderID).toHaveBeenCalledWith('codex')
    expect(setAvailableModels).toHaveBeenCalledWith(['gpt-5', 'gpt-5-mini'])
    expect(setSelectedModel).toHaveBeenCalledOnce()
    expect(setProviderGateway).toHaveBeenCalledOnce()
    expect(setProviderGatewayError).toHaveBeenCalledWith(null)
    expect(setAgentCatalog).toHaveBeenCalledOnce()
    expect(setRecentAttachmentReferences).toHaveBeenCalledWith([{ id: 'att-1' }])
    expect(setLoadError).not.toHaveBeenCalled()
  })
})
