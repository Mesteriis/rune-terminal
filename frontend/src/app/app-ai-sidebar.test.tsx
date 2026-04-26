import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { HTMLAttributes, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppAiSidebar } from '@/app/app-ai-sidebar'
import { clearAiPromptHandoff, queueAiPromptHandoff } from '@/shared/model/ai-handoff'

const agentPanelMock = {
  activeConversationSummary: null,
  activeConversationID: '',
  activeProviderGateway: null,
  activeProviderHistoryError: null,
  activeProviderHistoryRuns: [],
  activeProviderHistoryTotal: 0,
  answerQuestionnaire: vi.fn(),
  approvePendingPlan: vi.fn(),
  archiveConversation: vi.fn(),
  availableModes: [],
  availableModels: [],
  availableProfiles: [],
  availableProviders: [],
  availableRoles: [],
  cancelActiveSubmission: vi.fn(),
  cancelPendingPlan: vi.fn(),
  contextWidgetLoadError: null,
  contextWidgetOptions: [],
  conversationCounts: { all: 0, archived: 0, open: 0 },
  conversationScope: 'recent' as const,
  conversationSearchQuery: '',
  conversations: [],
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  draft: '',
  handleContextOptionsOpen: vi.fn(),
  isActiveProviderHistoryPending: false,
  isConversationListPending: false,
  isConversationPending: false,
  isInteractionPending: false,
  isProviderGatewayPending: false,
  isProviderRouteProbing: false,
  isProviderRoutePreparing: false,
  isResponseCancellable: false,
  isSubmitting: false,
  isWidgetContextEnabled: true,
  missingContextWidgetCount: 0,
  panelState: null,
  queuedAttachmentReferences: [],
  clearActiveProviderRouteState: vi.fn(),
  removeQueuedAttachmentReference: vi.fn(),
  renameConversation: vi.fn(),
  prewarmActiveProviderRoute: vi.fn(),
  probeActiveProviderRoute: vi.fn(),
  providerGatewayError: null,
  repairMissingContextWidgets: vi.fn(),
  refreshProviderGatewaySnapshot: vi.fn(),
  resetContextWidgetSelection: vi.fn(),
  restoreConversation: vi.fn(),
  selectMode: vi.fn(),
  selectedContextWidgetIDs: [],
  selectedModeID: '',
  selectedModel: '',
  selectedProfileID: '',
  selectedProviderID: '',
  selectedRoleID: '',
  selectProfile: vi.fn(),
  selectProvider: vi.fn(),
  selectRole: vi.fn(),
  setConversationScope: vi.fn(),
  setConversationSearchQuery: vi.fn(),
  setDraft: vi.fn(),
  setIsWidgetContextEnabled: vi.fn(),
  setSelectedContextWidgetIDs: vi.fn(),
  setSelectedModel: vi.fn(),
  submitDraft: vi.fn(),
  switchConversation: vi.fn(),
  useAllContextWidgets: vi.fn(),
  useCurrentContextWidget: vi.fn(),
}

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => true,
}))

vi.mock('@/features/agent/model/use-agent-panel', () => ({
  useAgentPanel: vi.fn(() => agentPanelMock),
}))

vi.mock('@/widgets', () => ({
  AiPanelHeaderWidget: () => <div data-testid="ai-panel-header-mock">header</div>,
  AiPanelWidget: () => <div data-testid="ai-panel-widget-mock">body</div>,
}))

describe('AppAiSidebar', () => {
  afterEach(() => {
    clearAiPromptHandoff()
    agentPanelMock.draft = ''
    agentPanelMock.isConversationPending = false
    agentPanelMock.isInteractionPending = false
    agentPanelMock.isSubmitting = false
    vi.clearAllMocks()
  })

  it('applies queued terminal handoff prompt and context when the AI sidebar opens', async () => {
    queueAiPromptHandoff({
      context_widget_ids: ['term-pve'],
      prompt: 'Проверь и исправь ошибку на pve',
      submit: false,
    })

    render(
      <AppAiSidebar
        contentAreaRef={{ current: document.createElement('div') }}
        dockviewApiRef={{ current: null }}
        isOpen
      />,
    )

    await waitFor(() => {
      expect(agentPanelMock.setSelectedContextWidgetIDs).toHaveBeenCalledWith(['term-pve'])
      expect(agentPanelMock.setDraft).toHaveBeenCalledWith('Проверь и исправь ошибку на pve')
    })

    expect(agentPanelMock.submitDraft).not.toHaveBeenCalled()
  })

  it('auto-submits queued terminal handoff prompts once the draft is applied', async () => {
    queueAiPromptHandoff({
      context_widget_ids: ['term-pve'],
      prompt: 'Проверь и исправь ошибку на pve',
      submit: true,
    })
    agentPanelMock.draft = 'Проверь и исправь ошибку на pve'

    render(
      <AppAiSidebar
        contentAreaRef={{ current: document.createElement('div') }}
        dockviewApiRef={{ current: null }}
        isOpen
      />,
    )

    await waitFor(() => {
      expect(agentPanelMock.submitDraft).toHaveBeenCalledTimes(1)
    })
  })

  it('renders compact provider route controls and recent run diagnostics from gateway runtime truth', async () => {
    agentPanelMock.activeProviderGateway = {
      provider_id: 'codex-cli',
      provider_kind: 'codex',
      display_name: 'Codex CLI',
      enabled: true,
      active: true,
      route_ready: true,
      route_status_state: 'ready',
      route_status_message: 'Codex CLI route is authenticated.',
      route_prepared: false,
      route_prepare_state: 'ready',
      route_prepare_message: '',
      route_prepare_expires_at: '2026-04-26T10:30:00Z',
      route_prepare_stale: false,
      route_prewarm_policy: 'on_activate',
      route_warm_ttl_seconds: 900,
      route_latency_ms: 48,
      route_prepare_latency_ms: 71,
      total_runs: 4,
      succeeded_runs: 3,
      failed_runs: 1,
      cancelled_runs: 0,
      average_duration_ms: 1200,
      average_first_response_latency_ms: 320,
      last_duration_ms: 980,
      last_first_response_latency_ms: 240,
    }
    agentPanelMock.activeProviderHistoryTotal = 4
    agentPanelMock.activeProviderHistoryRuns = [
      {
        id: 'run-1',
        provider_id: 'codex-cli',
        provider_kind: 'codex',
        provider_display_name: 'Codex CLI',
        request_mode: 'stream',
        model: 'gpt-5.4',
        status: 'failed',
        error_code: 'timeout',
        error_message: 'Timed out waiting for first response.',
        route_ready: true,
        route_status_state: 'ready',
        route_status_message: 'Codex CLI route is authenticated.',
        route_prepared: true,
        route_prepare_state: 'prepared',
        route_prepare_message: 'Codex CLI route is warm.',
        resolved_binary: '/usr/local/bin/codex',
        duration_ms: 1820,
        first_response_latency_ms: 600,
        started_at: '2026-04-26T10:21:00Z',
        completed_at: '2026-04-26T10:21:02Z',
        actor_username: 'avm',
      },
      {
        id: 'run-2',
        provider_id: 'codex-cli',
        provider_kind: 'codex',
        provider_display_name: 'Codex CLI',
        request_mode: 'stream',
        model: 'gpt-5.4',
        status: 'succeeded',
        route_ready: true,
        route_status_state: 'ready',
        route_status_message: 'Codex CLI route is authenticated.',
        route_prepared: true,
        route_prepare_state: 'prepared',
        route_prepare_message: 'Codex CLI route is warm.',
        duration_ms: 960,
        first_response_latency_ms: 240,
        started_at: '2026-04-26T10:18:00Z',
        completed_at: '2026-04-26T10:18:01Z',
      },
    ]

    render(
      <AppAiSidebar
        contentAreaRef={{ current: document.createElement('div') }}
        dockviewApiRef={{ current: null }}
        isOpen
      />,
    )

    expect(screen.getByText('Active route')).toBeVisible()
    expect(screen.getByText('Codex CLI · ready')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Prepare route' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Clear route state' })).toBeVisible()
    expect(screen.getByText('Showing 2 of 4')).toBeVisible()
    expect(screen.getByText('Timed out waiting for first response.')).toBeVisible()
    expect(screen.getByText('Actor: avm')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Prepare route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear route state' }))

    await waitFor(() => {
      expect(agentPanelMock.prewarmActiveProviderRoute).toHaveBeenCalledTimes(1)
      expect(agentPanelMock.clearActiveProviderRouteState).toHaveBeenCalledTimes(1)
    })
  })
})
