import { describe, expect, it, vi } from 'vitest'

import {
  deleteConversationForPanel,
  refreshConversationListForPanel,
  resetConversationSubmissionRuntime,
} from '@/features/agent/model/agent-panel-conversations'

describe('agent panel conversation helpers', () => {
  it('refreshes the conversation list through nonce-guarded updates', async () => {
    const setConversations = vi.fn()
    const setConversationCounts = vi.fn()
    const setActiveConversationID = vi.fn()
    const setIsConversationListPending = vi.fn()
    let requestNonce = 0

    await expect(
      refreshConversationListForPanel(
        {
          query: 'deploy',
          scope: 'recent',
          nextRequestNonce: () => {
            requestNonce += 1
            return requestNonce
          },
          getRequestNonce: () => requestNonce,
          setActiveConversationID,
          setConversationCounts,
          setConversations,
          setIsConversationListPending,
        },
        {
          activateAgentConversation: vi.fn(),
          archiveAgentConversation: vi.fn(),
          createAgentConversation: vi.fn(),
          deleteAgentConversation: vi.fn(),
          fetchAgentConversations: vi.fn().mockResolvedValue({
            active_conversation_id: 'conv-2',
            counts: {
              recent: 2,
              archived: 1,
              all: 3,
            },
            conversations: [
              {
                id: 'conv-1',
                title: 'Older',
                created_at: '2026-04-27T10:00:00Z',
                updated_at: '2026-04-27T10:00:00Z',
                message_count: 1,
              },
              {
                id: 'conv-2',
                title: 'Newer',
                created_at: '2026-04-27T11:00:00Z',
                updated_at: '2026-04-27T11:00:00Z',
                message_count: 2,
              },
            ],
          }),
          getErrorMessage: vi.fn(),
          renameAgentConversation: vi.fn(),
          restoreAgentConversation: vi.fn(),
          sortConversationSummaries: vi.fn((conversations) => conversations.slice().reverse()),
        },
      ),
    ).resolves.toMatchObject({
      active_conversation_id: 'conv-2',
    })

    expect(setIsConversationListPending).toHaveBeenNthCalledWith(1, true)
    expect(setConversations).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'conv-2' }),
      expect.objectContaining({ id: 'conv-1' }),
    ])
    expect(setConversationCounts).toHaveBeenCalledWith({
      recent: 2,
      archived: 1,
      all: 3,
    })
    expect(setActiveConversationID).toHaveBeenCalledOnce()
    expect(setIsConversationListPending).toHaveBeenLastCalledWith(false)
  })

  it('resets active submission runtime before conversation lifecycle transitions', () => {
    const bumpSubmissionNonce = vi.fn()
    const abortActiveSubmission = vi.fn()
    const closeActiveStream = vi.fn()
    const clearActiveAuditMessageID = vi.fn()

    resetConversationSubmissionRuntime({
      abortActiveSubmission,
      bumpSubmissionNonce,
      clearActiveAuditMessageID,
      closeActiveStream,
    })

    expect(bumpSubmissionNonce).toHaveBeenCalledOnce()
    expect(abortActiveSubmission).toHaveBeenCalledOnce()
    expect(closeActiveStream).toHaveBeenCalledOnce()
    expect(clearActiveAuditMessageID).toHaveBeenCalledOnce()
  })

  it('deletes the active conversation and refreshes the visible list', async () => {
    const applyConversationSnapshot = vi.fn()
    const resetConversationInteractionState = vi.fn()
    const setConversations = vi.fn()
    const setConversationCounts = vi.fn()
    const setActiveConversationID = vi.fn()
    const setIsConversationPending = vi.fn()
    const setSubmitError = vi.fn()
    const resetConversationSubmissionRuntimeFn = vi.fn()

    await deleteConversationForPanel(
      {
        activeConversationID: 'conv-1',
        applyConversationSnapshot,
        beginPanelStateEpoch: () => 4,
        conversationID: 'conv-1',
        getPanelStateEpoch: () => 4,
        isConversationPending: false,
        isSubmitting: false,
        query: '',
        resetConversationInteractionState,
        resetConversationSubmissionRuntime: resetConversationSubmissionRuntimeFn,
        scope: 'recent',
        setActiveConversationID,
        setConversationCounts,
        setConversations,
        setIsConversationPending,
        setSubmitError,
      },
      {
        activateAgentConversation: vi.fn(),
        archiveAgentConversation: vi.fn(),
        createAgentConversation: vi.fn(),
        deleteAgentConversation: vi.fn().mockResolvedValue({
          id: 'conv-fallback',
          title: 'Fallback',
          messages: [],
          provider: {
            kind: 'codex',
            base_url: 'codex',
            streaming: true,
          },
          context_preferences: {
            widget_context_enabled: true,
            widget_ids: [],
          },
          created_at: '2026-04-27T11:00:00Z',
          updated_at: '2026-04-27T11:00:00Z',
        }),
        fetchAgentConversations: vi.fn().mockResolvedValue({
          active_conversation_id: 'conv-2',
          counts: {
            recent: 1,
            archived: 0,
            all: 1,
          },
          conversations: [
            {
              id: 'conv-2',
              title: 'Remaining',
              created_at: '2026-04-27T12:00:00Z',
              updated_at: '2026-04-27T12:00:00Z',
              message_count: 3,
            },
          ],
        }),
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        renameAgentConversation: vi.fn(),
        restoreAgentConversation: vi.fn(),
        sortConversationSummaries: vi.fn((conversations) => conversations),
      },
    )

    expect(resetConversationSubmissionRuntimeFn).toHaveBeenCalledOnce()
    expect(applyConversationSnapshot).toHaveBeenCalledOnce()
    expect(resetConversationInteractionState).toHaveBeenCalledOnce()
    expect(setConversations).toHaveBeenCalledWith([expect.objectContaining({ id: 'conv-2' })])
    expect(setConversationCounts).toHaveBeenCalledWith({
      recent: 1,
      archived: 0,
      all: 1,
    })
    expect(setActiveConversationID).toHaveBeenCalledWith('conv-2')
    expect(setSubmitError).not.toHaveBeenCalled()
  })
})
