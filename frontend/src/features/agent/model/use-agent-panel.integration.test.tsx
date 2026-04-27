import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAgentPanel } from '@/features/agent/model/use-agent-panel'
import { clearActiveWidgetHostId, setActiveWidgetHostId } from '@/shared/model/widget-focus'
import {
  registerTerminalPanelBinding,
  resetTerminalPanelBindingsForTests,
} from '@/features/terminal/model/panel-registry'

const {
  deleteAgentAttachmentReferenceMock,
  executeAgentToolMock,
  explainTerminalCommandMock,
  fetchAgentAttachmentReferencesMock,
  fetchAgentCatalogMock,
  fetchAgentConversationMock,
  fetchAgentConversationsMock,
  planTerminalCommandMock,
  renameAgentConversationMock,
  restoreAgentConversationMock,
  setAgentModeMock,
  setAgentProfileMock,
  setAgentRoleMock,
  streamAgentConversationMessageMock,
  updateAgentConversationContextMock,
  activateAgentConversationMock,
  archiveAgentConversationMock,
  createAgentConversationMock,
  deleteAgentConversationMock,
} = vi.hoisted(() => ({
  activateAgentConversationMock: vi.fn(),
  archiveAgentConversationMock: vi.fn(),
  createAgentConversationMock: vi.fn(),
  deleteAgentAttachmentReferenceMock: vi.fn(),
  deleteAgentConversationMock: vi.fn(),
  executeAgentToolMock: vi.fn(),
  explainTerminalCommandMock: vi.fn(),
  fetchAgentAttachmentReferencesMock: vi.fn(),
  fetchAgentCatalogMock: vi.fn(),
  fetchAgentConversationMock: vi.fn(),
  fetchAgentConversationsMock: vi.fn(),
  planTerminalCommandMock: vi.fn(),
  renameAgentConversationMock: vi.fn(),
  restoreAgentConversationMock: vi.fn(),
  setAgentModeMock: vi.fn(),
  setAgentProfileMock: vi.fn(),
  setAgentRoleMock: vi.fn(),
  streamAgentConversationMessageMock: vi.fn(),
  updateAgentConversationContextMock: vi.fn(),
}))

const { fetchAgentProviderCatalogMock, fetchAgentProviderGatewaySnapshotMock } = vi.hoisted(() => ({
  fetchAgentProviderCatalogMock: vi.fn(),
  fetchAgentProviderGatewaySnapshotMock: vi.fn(),
}))

const { resolveRuntimeContextMock } = vi.hoisted(() => ({
  resolveRuntimeContextMock: vi.fn(),
}))

const { fetchTerminalSnapshotMock } = vi.hoisted(() => ({
  fetchTerminalSnapshotMock: vi.fn(),
}))

vi.mock('@/features/agent/api/client', () => ({
  activateAgentConversation: activateAgentConversationMock,
  archiveAgentConversation: archiveAgentConversationMock,
  createAgentConversation: createAgentConversationMock,
  deleteAgentAttachmentReference: deleteAgentAttachmentReferenceMock,
  deleteAgentConversation: deleteAgentConversationMock,
  executeAgentTool: executeAgentToolMock,
  explainTerminalCommand: explainTerminalCommandMock,
  fetchAgentAttachmentReferences: fetchAgentAttachmentReferencesMock,
  fetchAgentCatalog: fetchAgentCatalogMock,
  fetchAgentConversation: fetchAgentConversationMock,
  fetchAgentConversations: fetchAgentConversationsMock,
  planTerminalCommand: planTerminalCommandMock,
  renameAgentConversation: renameAgentConversationMock,
  restoreAgentConversation: restoreAgentConversationMock,
  setAgentMode: setAgentModeMock,
  setAgentProfile: setAgentProfileMock,
  setAgentRole: setAgentRoleMock,
  streamAgentConversationMessage: streamAgentConversationMessageMock,
  updateAgentConversationContext: updateAgentConversationContextMock,
}))

vi.mock('@/features/agent/api/provider-client', () => ({
  fetchAgentProviderCatalog: fetchAgentProviderCatalogMock,
  fetchAgentProviderGatewaySnapshot: fetchAgentProviderGatewaySnapshotMock,
  clearAgentProviderRouteState: vi.fn(),
  prewarmAgentProvider: vi.fn(),
  probeAgentProvider: vi.fn(),
  setActiveAgentProvider: vi.fn(),
}))

vi.mock('@/shared/api/runtime', () => ({
  resolveRuntimeContext: resolveRuntimeContextMock,
}))

vi.mock('@/features/terminal/api/client', () => ({
  fetchTerminalSnapshot: fetchTerminalSnapshotMock,
}))

function createConversationSnapshot(
  overrides: Partial<Record<string, unknown>> = {},
  messages: Array<Record<string, unknown>> = [],
) {
  return {
    id: 'conv-1',
    title: 'Conversation',
    messages,
    provider: {
      kind: 'codex',
      base_url: 'codex',
      model: 'gpt-5',
      streaming: true,
    },
    context_preferences: {
      widget_context_enabled: true,
      widget_ids: [],
    },
    created_at: '2026-04-27T10:00:00Z',
    updated_at: '2026-04-27T10:00:00Z',
    ...overrides,
  }
}

function createProviderCatalog() {
  return {
    current_actor: { username: 'avm', home_dir: '/Users/avm' },
    providers: [
      {
        id: 'codex-cli',
        kind: 'codex',
        display_name: 'Codex CLI',
        enabled: true,
        active: true,
        access: { owner_username: 'avm' },
        created_by: { username: 'avm' },
        updated_by: { username: 'avm' },
        route_policy: {},
        codex: { command: 'codex', model: 'gpt-5', chat_models: ['gpt-5'] },
        created_at: '2026-04-27T10:00:00Z',
        updated_at: '2026-04-27T10:00:00Z',
      },
    ],
    active_provider_id: 'codex-cli',
    supported_kinds: ['codex', 'claude', 'openai-compatible'],
  }
}

function createGatewaySnapshot() {
  return {
    generated_at: '2026-04-27T10:00:00Z',
    providers: [
      {
        provider_id: 'codex-cli',
        provider_kind: 'codex',
        display_name: 'Codex CLI',
        enabled: true,
        active: true,
        route_ready: true,
        route_prepared: true,
        route_prepare_stale: false,
        route_latency_ms: 10,
        route_prepare_latency_ms: 10,
        route_warm_ttl_seconds: 900,
        total_runs: 0,
        succeeded_runs: 0,
        failed_runs: 0,
        cancelled_runs: 0,
        average_duration_ms: 0,
        average_first_response_latency_ms: 0,
        last_duration_ms: 0,
        last_first_response_latency_ms: 0,
      },
    ],
    recent_runs: [],
    recent_runs_total: 0,
    recent_runs_offset: 0,
    recent_runs_limit: 3,
    recent_runs_has_more: false,
  }
}

function createAgentCatalog() {
  return {
    profiles: [{ id: 'default', name: 'Default', description: '', system_prompt: '', overlay: {} }],
    roles: [{ id: 'developer', name: 'Developer', description: '', prompt: '', overlay: {} }],
    modes: [{ id: 'execute', name: 'Execute', description: '', prompt: '', overlay: {} }],
    active: {
      profile: { id: 'default', name: 'Default', description: '', system_prompt: '', overlay: {} },
      role: { id: 'developer', name: 'Developer', description: '', prompt: '', overlay: {} },
      mode: { id: 'execute', name: 'Execute', description: '', prompt: '', overlay: {} },
      effective_prompt: '',
      effective_policy_profile: {},
    },
  }
}

function createConversationList() {
  return {
    active_conversation_id: 'conv-1',
    counts: {
      recent: 1,
      archived: 0,
      all: 1,
    },
    conversations: [
      {
        id: 'conv-1',
        title: 'Conversation',
        created_at: '2026-04-27T10:00:00Z',
        updated_at: '2026-04-27T10:00:00Z',
        message_count: 0,
      },
    ],
  }
}

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, reject, resolve }
}

describe('useAgentPanel integration', () => {
  beforeEach(() => {
    clearActiveWidgetHostId()
    resetTerminalPanelBindingsForTests()
    vi.clearAllMocks()

    resolveRuntimeContextMock.mockResolvedValue({
      baseUrl: 'http://127.0.0.1:8090',
      authToken: 'runtime-token',
      homeDir: '/Users/avm',
      repoRoot: '/repo',
    })
    fetchAgentConversationMock.mockResolvedValue(createConversationSnapshot())
    fetchAgentProviderCatalogMock.mockResolvedValue(createProviderCatalog())
    fetchAgentProviderGatewaySnapshotMock.mockResolvedValue(createGatewaySnapshot())
    fetchAgentCatalogMock.mockResolvedValue(createAgentCatalog())
    fetchAgentAttachmentReferencesMock.mockResolvedValue([])
    fetchAgentConversationsMock.mockResolvedValue(createConversationList())
  })

  afterEach(() => {
    clearActiveWidgetHostId()
    resetTerminalPanelBindingsForTests()
  })

  it('submits a plain chat prompt and refreshes the conversation snapshot after streaming', async () => {
    fetchAgentConversationMock.mockResolvedValueOnce(createConversationSnapshot()).mockResolvedValueOnce(
      createConversationSnapshot({}, [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'done',
          status: 'complete',
          created_at: '2026-04-27T10:01:00Z',
        },
      ]),
    )

    streamAgentConversationMessageMock.mockImplementation(async (_body, options) => {
      options.onEvent({
        type: 'message-start',
        message_id: 'assistant-1',
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: '',
          status: 'streaming',
          created_at: '2026-04-27T10:01:00Z',
        },
      })
      options.onEvent({
        type: 'message-complete',
        message_id: 'assistant-1',
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'done',
          status: 'complete',
          created_at: '2026-04-27T10:01:00Z',
        },
      })

      return {
        cancel: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        done: Promise.resolve(),
      }
    })

    const { result } = renderHook(() => useAgentPanel('ai-main', true))

    await waitFor(() => expect(result.current.activeConversationID).toBe('conv-1'))

    act(() => {
      result.current.setDraft('hello')
    })

    await act(async () => {
      await result.current.submitDraft()
    })

    await waitFor(() => expect(streamAgentConversationMessageMock).toHaveBeenCalledOnce())
    await waitFor(() => expect(result.current.draft).toBe(''))
    await waitFor(() =>
      expect(result.current.panelState.messages.some((message) => message.content.includes('done'))).toBe(
        true,
      ),
    )
  })

  it('creates a pending approval flow for /run prompts that require terminal confirmation', async () => {
    setActiveWidgetHostId('ai-main')
    registerTerminalPanelBinding({
      hostId: 'ai-main',
      preset: 'main',
      runtimeWidgetId: 'term-main',
    })

    fetchTerminalSnapshotMock.mockResolvedValue({
      state: {
        connection_kind: 'local',
        connection_id: 'local',
      },
      next_seq: 7,
      chunks: [],
    })
    executeAgentToolMock.mockResolvedValue({
      status: 'requires_confirmation',
      pending_approval: {
        id: 'approval-1',
        summary: 'Run df -h',
      },
    })

    const { result } = renderHook(() => useAgentPanel('ai-main', true))

    await waitFor(() => expect(result.current.activeConversationID).toBe('conv-1'))

    act(() => {
      result.current.setDraft('/run df -h')
    })

    await act(async () => {
      await result.current.submitDraft()
    })

    await waitFor(() => expect(result.current.isInteractionPending).toBe(true))
    await waitFor(() =>
      expect(
        result.current.panelState.messages.some(
          (message) => message.type === 'approval' || message.type === 'plan',
        ),
      ).toBe(true),
    )
  })

  it('routes questionnaire answers into an approval flow and then streams the approved backend prompt', async () => {
    fetchAgentConversationMock.mockResolvedValueOnce(createConversationSnapshot()).mockResolvedValueOnce(
      createConversationSnapshot({}, [
        {
          id: 'assistant-2',
          role: 'assistant',
          content: 'deployment staged',
          status: 'complete',
          created_at: '2026-04-27T10:02:00Z',
        },
      ]),
    )

    streamAgentConversationMessageMock.mockImplementation(async (_body, options) => {
      options.onEvent({
        type: 'message-start',
        message_id: 'assistant-2',
        message: {
          id: 'assistant-2',
          role: 'assistant',
          content: '',
          status: 'streaming',
          created_at: '2026-04-27T10:02:00Z',
        },
      })
      options.onEvent({
        type: 'message-complete',
        message_id: 'assistant-2',
        message: {
          id: 'assistant-2',
          role: 'assistant',
          content: 'deployment staged',
          status: 'complete',
          created_at: '2026-04-27T10:02:00Z',
        },
      })

      return {
        cancel: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        done: Promise.resolve(),
      }
    })

    const { result } = renderHook(() => useAgentPanel('ai-main', true))

    await waitFor(() => expect(result.current.activeConversationID).toBe('conv-1'))

    act(() => {
      result.current.setDraft('deploy api config to environment')
    })

    await act(async () => {
      await result.current.submitDraft()
    })

    await waitFor(() =>
      expect(result.current.panelState.messages.some((message) => message.type === 'questionnaire')).toBe(
        true,
      ),
    )

    const questionnaireMessage = result.current.panelState.messages.find(
      (message) => message.type === 'questionnaire',
    )
    if (questionnaireMessage?.type !== 'questionnaire') {
      throw new Error('Expected questionnaire message')
    }

    await act(async () => {
      await result.current.answerQuestionnaire(questionnaireMessage, 'staging')
    })

    await waitFor(() =>
      expect(result.current.panelState.messages.some((message) => message.type === 'approval')).toBe(true),
    )

    const approvalMessage = result.current.panelState.messages.find((message) => message.type === 'approval')
    if (approvalMessage?.type !== 'approval') {
      throw new Error('Expected approval message')
    }

    await act(async () => {
      await result.current.approvePendingPlan(approvalMessage)
    })

    await waitFor(() => expect(streamAgentConversationMessageMock).toHaveBeenCalledOnce())
    expect(streamAgentConversationMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'deploy api config to environment',
        model: 'gpt-5',
      }),
      expect.any(Object),
    )
    await waitFor(() =>
      expect(
        result.current.panelState.messages.some(
          (message) => typeof message.content === 'string' && message.content.includes('deployment staged'),
        ),
      ).toBe(true),
    )
    expect(result.current.isInteractionPending).toBe(false)
  })

  it('cancels an active backend stream and surfaces an operator-visible cancellation message', async () => {
    const cancelMock = vi.fn().mockResolvedValue(undefined)
    const deferredDone = createDeferredPromise<void>()

    streamAgentConversationMessageMock.mockImplementation(async (_body, options) => {
      options.onEvent({
        type: 'message-start',
        message_id: 'assistant-3',
        message: {
          id: 'assistant-3',
          role: 'assistant',
          content: '',
          status: 'streaming',
          created_at: '2026-04-27T10:03:00Z',
        },
      })

      return {
        cancel: cancelMock,
        close: vi.fn(),
        done: deferredDone.promise,
      }
    })

    const { result } = renderHook(() => useAgentPanel('ai-main', true))

    await waitFor(() => expect(result.current.activeConversationID).toBe('conv-1'))

    act(() => {
      result.current.setDraft('hello')
    })

    act(() => {
      void result.current.submitDraft()
    })

    await waitFor(() => expect(result.current.isSubmitting).toBe(true))
    await waitFor(() => expect(result.current.isResponseCancellable).toBe(true))

    act(() => {
      result.current.cancelActiveSubmission()
    })

    await waitFor(() => expect(cancelMock).toHaveBeenCalledOnce())
    await waitFor(() => expect(result.current.isSubmitting).toBe(false))
    await waitFor(() =>
      expect(
        result.current.panelState.messages.some((message) =>
          message.content.includes('Response cancelled by operator.'),
        ),
      ).toBe(true),
    )

    deferredDone.resolve()
  })
})
