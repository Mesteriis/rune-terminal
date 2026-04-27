import { describe, expect, it, vi } from 'vitest'

import {
  cancelActiveSubmissionForPanel,
  runBackendPromptForPanel,
} from '@/features/agent/model/agent-panel-streaming'

describe('agent panel streaming helpers', () => {
  it('short-circuits backend streaming when /run executes directly in the terminal', async () => {
    const blockAiWidget = vi.fn()
    const unblockAiWidget = vi.fn()
    const setIsSubmitting = vi.fn()
    const setIsResponseCancellable = vi.fn()
    const setLoadError = vi.fn()
    const setSubmitError = vi.fn()
    const setActiveSubmissionAbort = vi.fn()
    const setActiveAuditMessageID = vi.fn()
    const setActiveStream = vi.fn()
    let submissionNonce = 0

    await runBackendPromptForPanel(
      {
        applyConversationSnapshot: vi.fn(),
        blockAiWidget,
        createConversationContext: vi.fn(),
        getActiveAuditMessageID: () => null,
        getHostId: () => 'ai-main',
        getSubmissionNonce: () => submissionNonce,
        nextSubmissionNonce: () => {
          submissionNonce += 1
          return submissionNonce
        },
        prompt: '/run df -h',
        refreshConversationList: vi.fn(),
        refreshProviderGatewaySnapshot: vi.fn(),
        resolveRuntimeContext: vi.fn().mockResolvedValue({ repoRoot: '/repo' }),
        runTerminalPrompt: vi.fn().mockResolvedValue(true),
        setActiveAuditMessageID,
        setActiveStream,
        setActiveSubmissionAbort,
        setIsResponseCancellable,
        setIsSubmitting,
        setLoadError,
        setMessages: vi.fn(),
        setSubmitError,
        unblockAiWidget,
        updateAuditMessageEntries: vi.fn(),
      },
      {
        advanceAuditEntries: vi.fn(),
        appendAgentConversationMessage: vi.fn(),
        applyAgentConversationStreamEvent: vi.fn(),
        completeAuditEntries: vi.fn(),
        failAuditEntries: vi.fn(),
        fetchAgentConversation: vi.fn(),
        finalizeAgentConversationStreamingMessages: vi.fn(),
        streamAgentConversationMessage: vi.fn(),
      },
    )

    expect(blockAiWidget).toHaveBeenCalledOnce()
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true)
    expect(setIsSubmitting).toHaveBeenLastCalledWith(false)
    expect(setIsResponseCancellable).toHaveBeenNthCalledWith(1, true)
    expect(setIsResponseCancellable).toHaveBeenLastCalledWith(false)
    expect(setLoadError).toHaveBeenCalledWith(null)
    expect(setSubmitError).toHaveBeenCalledWith(null)
    expect(setActiveSubmissionAbort).toHaveBeenCalledWith(null)
    expect(setActiveAuditMessageID).toHaveBeenLastCalledWith(null)
    expect(setActiveStream).not.toHaveBeenCalledWith(expect.objectContaining({ done: expect.anything() }))
    expect(unblockAiWidget).toHaveBeenCalledOnce()
  })

  it('refreshes the conversation snapshot after a successful stream run', async () => {
    let onEvent: ((event: unknown) => void) | null = null
    let submissionNonce = 0
    const applyConversationSnapshot = vi.fn()
    const refreshConversationList = vi.fn().mockResolvedValue(null)
    const setMessages = vi.fn((update: (messages: unknown[] | null) => unknown[]) => update([]))
    const setActiveStream = vi.fn()

    await runBackendPromptForPanel(
      {
        applyConversationSnapshot,
        blockAiWidget: vi.fn(),
        createConversationContext: vi.fn().mockReturnValue({
          action_source: 'frontend.ai.sidebar',
          active_widget_id: 'term-main',
          repo_root: '/repo',
          widget_context_enabled: true,
        }),
        getActiveAuditMessageID: () => null,
        getHostId: () => 'ai-main',
        getSubmissionNonce: () => submissionNonce,
        nextSubmissionNonce: () => {
          submissionNonce += 1
          return submissionNonce
        },
        prompt: 'hello',
        refreshConversationList,
        refreshProviderGatewaySnapshot: vi.fn(),
        resolveRuntimeContext: vi.fn().mockResolvedValue({ repoRoot: '/repo' }),
        runTerminalPrompt: vi.fn().mockResolvedValue(false),
        setActiveAuditMessageID: vi.fn(),
        setActiveStream,
        setActiveSubmissionAbort: vi.fn(),
        setIsResponseCancellable: vi.fn(),
        setIsSubmitting: vi.fn(),
        setLoadError: vi.fn(),
        setMessages,
        setSubmitError: vi.fn(),
        unblockAiWidget: vi.fn(),
        updateAuditMessageEntries: vi.fn(),
      },
      {
        advanceAuditEntries: vi.fn((entries: unknown[]) => entries),
        appendAgentConversationMessage: vi.fn(),
        applyAgentConversationStreamEvent: vi.fn((messages: unknown[], event: { type: string }) => [
          ...messages,
          event,
        ]),
        completeAuditEntries: vi.fn((entries: unknown[]) => entries),
        failAuditEntries: vi.fn((entries: unknown[]) => entries),
        fetchAgentConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
        finalizeAgentConversationStreamingMessages: vi.fn(),
        streamAgentConversationMessage: vi.fn().mockImplementation(async (_body, options) => {
          onEvent = options.onEvent as (event: unknown) => void
          onEvent?.({ type: 'message-start', message: { id: 'm1' } })
          return {
            cancel: vi.fn().mockResolvedValue(undefined),
            close: vi.fn(),
            done: Promise.resolve(),
          }
        }),
      },
    )

    expect(onEvent).not.toBeNull()
    expect(setMessages).toHaveBeenCalled()
    expect(setActiveStream).toHaveBeenCalledTimes(2)
    expect(applyConversationSnapshot).toHaveBeenCalledWith({ id: 'conv-1' })
    expect(refreshConversationList).toHaveBeenCalledOnce()
  })

  it('cancels the active stream and appends an operator-visible cancellation message', () => {
    const cancel = vi.fn().mockResolvedValue(undefined)
    const setMessages = vi.fn((update: (messages: any[] | null) => any[]) =>
      update([{ id: 'm1', status: 'complete', content: 'ok' }]),
    )
    const updateAuditMessageEntries = vi.fn()

    cancelActiveSubmissionForPanel(
      {
        activeAuditMessageID: 'audit-1',
        activeStream: {
          cancel,
          close: vi.fn(),
          done: Promise.resolve(),
        },
        hasActiveAbortController: true,
        hostId: 'ai-main',
        isSubmitting: true,
        nextSubmissionNonce: () => 9,
        setActiveAuditMessageID: vi.fn(),
        setActiveStream: vi.fn(),
        setActiveSubmissionAbort: vi.fn(),
        setIsResponseCancellable: vi.fn(),
        setIsSubmitting: vi.fn(),
        setMessages,
        setSubmitError: vi.fn(),
        unblockAiWidget: vi.fn(),
        updateAuditMessageEntries,
      },
      {
        advanceAuditEntries: vi.fn(),
        appendAgentConversationMessage: vi.fn((messages: any[], message: any) => [...messages, message]),
        applyAgentConversationStreamEvent: vi.fn(),
        completeAuditEntries: vi.fn(),
        failAuditEntries: vi.fn((entries: unknown[]) => [...entries, 'failed']),
        fetchAgentConversation: vi.fn(),
        finalizeAgentConversationStreamingMessages: vi.fn((messages: any[]) => messages),
        streamAgentConversationMessage: vi.fn(),
      },
    )

    expect(cancel).toHaveBeenCalledOnce()
    expect(updateAuditMessageEntries).toHaveBeenCalledOnce()
    expect(setMessages).toHaveBeenCalledOnce()
  })
})
