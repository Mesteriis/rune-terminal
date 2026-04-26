import { render, waitFor } from '@testing-library/react'
import type { HTMLAttributes, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppAiSidebar } from '@/app/app-ai-sidebar'
import { clearAiPromptHandoff, queueAiPromptHandoff } from '@/shared/model/ai-handoff'

const agentPanelMock = {
  activeConversationSummary: null,
  activeConversationID: '',
  activeProviderGateway: null,
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
  isConversationListPending: false,
  isConversationPending: false,
  isInteractionPending: false,
  isProviderGatewayPending: false,
  isProviderRoutePreparing: false,
  isResponseCancellable: false,
  isSubmitting: false,
  isWidgetContextEnabled: true,
  missingContextWidgetCount: 0,
  panelState: null,
  queuedAttachmentReferences: [],
  removeQueuedAttachmentReference: vi.fn(),
  renameConversation: vi.fn(),
  prewarmActiveProviderRoute: vi.fn(),
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
})
