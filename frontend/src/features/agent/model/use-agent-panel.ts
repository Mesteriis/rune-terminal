import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchAgentConversation,
  streamAgentConversationMessage,
  type AgentConversationMessage,
  type AgentConversationProvider,
  type AgentConversationStreamConnection,
} from '@/features/agent/api/client'
import {
  advanceAuditEntries,
  completeAuditEntries,
  createApprovalMessage,
  createAuditMessage,
  createPendingInteractionFlow,
  failAuditEntries,
  type PendingInteractionFlow,
  updateApprovalMessageStatus,
  updateQuestionnaireMessageAnswer,
} from '@/features/agent/model/interaction-flow'
import {
  prependAgentConversationMessage,
  prependAgentPanelStatusMessage,
  applyAgentConversationStreamEvent,
  createAgentPanelErrorState,
  createAgentPanelLoadingState,
  createAgentPanelStateFromMessages,
  finalizeAgentConversationStreamingMessages,
} from '@/features/agent/model/panel-state'
import type {
  AiPanelWidgetState,
  ApprovalMessage,
  ChatMessageSortKey,
  ChatMessageView,
  QuestionnaireMessage,
} from '@/features/agent/model/types'
import { resolveRuntimeContext } from '@/shared/api/runtime'
import { blockAiWidget, unblockAiWidget } from '@/shared/model/ai-blocked-widgets'

function createOptimisticUserConversationMessage(
  hostId: string,
  sequence: number,
  prompt: string,
): AgentConversationMessage {
  return {
    id: `agent-local-user-${hostId}-${sequence}`,
    role: 'user',
    content: prompt,
    status: 'complete',
    created_at: new Date().toISOString(),
  }
}

function sortMessagesBySortKey(messages: ChatMessageView[]) {
  return [...messages].sort((left, right) => (right.sortKey ?? 0) - (left.sortKey ?? 0))
}

function upsertInteractionMessage(currentMessages: ChatMessageView[], nextMessage: ChatMessageView) {
  const messageIndex = currentMessages.findIndex((message) => message.id === nextMessage.id)

  if (messageIndex < 0) {
    return sortMessagesBySortKey([nextMessage, ...currentMessages])
  }

  const nextMessages = [...currentMessages]
  nextMessages[messageIndex] = nextMessage
  return sortMessagesBySortKey(nextMessages)
}

function updateInteractionMessage(
  currentMessages: ChatMessageView[],
  messageID: string,
  update: (message: ChatMessageView) => ChatMessageView,
) {
  const messageIndex = currentMessages.findIndex((message) => message.id === messageID)

  if (messageIndex < 0) {
    return currentMessages
  }

  const nextMessages = [...currentMessages]
  nextMessages[messageIndex] = update(nextMessages[messageIndex])
  return sortMessagesBySortKey(nextMessages)
}

export function useAgentPanel(hostId: string, enabled = true) {
  const [messages, setMessages] = useState<AgentConversationMessage[] | null>(null)
  const [interactionMessages, setInteractionMessages] = useState<ChatMessageView[]>([])
  const [pendingFlow, setPendingFlow] = useState<PendingInteractionFlow | null>(null)
  const [provider, setProvider] = useState<AgentConversationProvider | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const activeStreamRef = useRef<AgentConversationStreamConnection | null>(null)
  const optimisticMessageCounterRef = useRef(0)
  const flowCounterRef = useRef(0)
  const localSortCounterRef = useRef(0)
  const pendingFlowRef = useRef<PendingInteractionFlow | null>(null)
  const submissionNonceRef = useRef(0)

  const nextLocalSortKey = useCallback((): ChatMessageSortKey => {
    const nextCounter = localSortCounterRef.current
    localSortCounterRef.current += 1
    return Date.now() * 1000 + nextCounter
  }, [])

  useEffect(() => {
    pendingFlowRef.current = pendingFlow
  }, [pendingFlow])

  useEffect(() => {
    return () => {
      submissionNonceRef.current += 1
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      pendingFlowRef.current = null
      unblockAiWidget(hostId)
    }
  }, [hostId])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    submissionNonceRef.current += 1
    activeStreamRef.current?.close()
    activeStreamRef.current = null
    pendingFlowRef.current = null
    unblockAiWidget(hostId)
    setMessages(null)
    setInteractionMessages([])
    setPendingFlow(null)
    setProvider(null)
    setLoadError(null)
    setSubmitError(null)
    setIsSubmitting(false)

    void fetchAgentConversation()
      .then((conversation) => {
        if (cancelled) {
          return
        }

        setMessages([...conversation.messages].reverse())
        setProvider(conversation.provider)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : `Unable to load backend conversation for ${hostId}.`

        setLoadError(message)
      })

    return () => {
      cancelled = true
      submissionNonceRef.current += 1
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      pendingFlowRef.current = null
      unblockAiWidget(hostId)
    }
  }, [enabled, hostId])

  const submitDraft = useCallback(async () => {
    const prompt = draft.trim()

    if (!enabled || isSubmitting || pendingFlowRef.current || prompt === '') {
      return
    }

    const optimisticUserMessage = createOptimisticUserConversationMessage(
      hostId,
      optimisticMessageCounterRef.current,
      prompt,
    )
    optimisticMessageCounterRef.current += 1
    const flowSequence = flowCounterRef.current
    flowCounterRef.current += 1
    const interactionFlow = createPendingInteractionFlow(hostId, prompt, flowSequence, nextLocalSortKey)

    setLoadError(null)
    setSubmitError(null)
    setMessages((currentMessages) =>
      prependAgentConversationMessage(currentMessages ?? [], optimisticUserMessage),
    )
    setInteractionMessages((currentMessages) =>
      sortMessagesBySortKey([...interactionFlow.messages, ...currentMessages]),
    )
    pendingFlowRef.current = interactionFlow.flow
    setPendingFlow(interactionFlow.flow)
    setDraft('')
  }, [draft, enabled, hostId, isSubmitting, nextLocalSortKey])

  const cancelPendingPlan = useCallback(
    (message: ApprovalMessage) => {
      const activeFlow = pendingFlowRef.current

      if (!activeFlow || activeFlow.flowID !== message.planId) {
        return
      }

      setInteractionMessages((currentMessages) =>
        updateInteractionMessage(currentMessages, message.id, (currentMessage) =>
          currentMessage.type === 'approval'
            ? updateApprovalMessageStatus(currentMessage, 'cancelled', nextLocalSortKey)
            : currentMessage,
        ),
      )
      pendingFlowRef.current = null
      setPendingFlow(null)
    },
    [nextLocalSortKey],
  )

  const answerQuestionnaire = useCallback(
    (message: QuestionnaireMessage, answer: string) => {
      const activeFlow = pendingFlowRef.current

      if (!activeFlow || activeFlow.questionnaireMessageID !== message.id) {
        return
      }

      const approvalMessage = createApprovalMessage(activeFlow.flowID, nextLocalSortKey)

      setInteractionMessages((currentMessages) =>
        sortMessagesBySortKey([
          approvalMessage,
          updateQuestionnaireMessageAnswer(message, answer, nextLocalSortKey),
          ...currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
        ]),
      )

      const nextFlow: PendingInteractionFlow = {
        ...activeFlow,
        approvalMessageID: approvalMessage.id,
        questionnaireMessageID: undefined,
      }
      pendingFlowRef.current = nextFlow
      setPendingFlow(nextFlow)
    },
    [nextLocalSortKey],
  )

  const approvePendingPlan = useCallback(
    async (message: ApprovalMessage) => {
      const activeFlow = pendingFlowRef.current

      if (!activeFlow || activeFlow.flowID !== message.planId) {
        return
      }

      const auditMessage = createAuditMessage(activeFlow.flowID, activeFlow.tools, nextLocalSortKey)
      const nextFlow: PendingInteractionFlow = {
        ...activeFlow,
        approvalMessageID: message.id,
        auditMessageID: auditMessage.id,
        auditProgressed: false,
      }
      pendingFlowRef.current = nextFlow
      setPendingFlow(nextFlow)
      setInteractionMessages((currentMessages) =>
        sortMessagesBySortKey([
          auditMessage,
          updateApprovalMessageStatus(message, 'approved', nextLocalSortKey),
          ...currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
        ]),
      )

      const submissionNonce = submissionNonceRef.current + 1
      submissionNonceRef.current = submissionNonce
      const isActiveSubmission = () => submissionNonceRef.current === submissionNonce

      setIsSubmitting(true)
      setLoadError(null)
      setSubmitError(null)
      blockAiWidget(hostId)

      let sawStreamEvent = false
      let sawCompletionEvent = false
      let connection: AgentConversationStreamConnection | null = null

      try {
        const runtimeContext = await resolveRuntimeContext()

        connection = await streamAgentConversationMessage(
          {
            prompt: activeFlow.prompt,
            context: {
              action_source: 'frontend.ai.sidebar',
              active_widget_id: hostId,
              repo_root: runtimeContext.repoRoot,
              widget_context_enabled: true,
            },
          },
          {
            onEvent: (event) => {
              if (!isActiveSubmission()) {
                return
              }

              sawStreamEvent = true

              setMessages((currentMessages) =>
                applyAgentConversationStreamEvent(currentMessages ?? [], event),
              )

              if (
                event.type === 'text-delta' &&
                pendingFlowRef.current?.auditMessageID &&
                !pendingFlowRef.current.auditProgressed
              ) {
                const auditMessageID = pendingFlowRef.current.auditMessageID

                setInteractionMessages((currentMessages) =>
                  updateInteractionMessage(currentMessages, auditMessageID, (currentMessage) =>
                    currentMessage.type === 'audit'
                      ? {
                          ...currentMessage,
                          entries: advanceAuditEntries(currentMessage.entries),
                        }
                      : currentMessage,
                  ),
                )

                const progressedFlow: PendingInteractionFlow = {
                  ...(pendingFlowRef.current as PendingInteractionFlow),
                  auditProgressed: true,
                }
                pendingFlowRef.current = progressedFlow
                setPendingFlow(progressedFlow)
              }

              if (event.type === 'message-complete') {
                sawCompletionEvent = true
                unblockAiWidget(hostId)
                setIsSubmitting(false)

                if (pendingFlowRef.current?.auditMessageID) {
                  const auditMessageID = pendingFlowRef.current.auditMessageID

                  setInteractionMessages((currentMessages) =>
                    updateInteractionMessage(currentMessages, auditMessageID, (currentMessage) =>
                      currentMessage.type === 'audit'
                        ? {
                            ...currentMessage,
                            entries: completeAuditEntries(currentMessage.entries),
                          }
                        : currentMessage,
                    ),
                  )
                }

                pendingFlowRef.current = null
                setPendingFlow(null)
              } else if (event.type === 'error') {
                unblockAiWidget(hostId)
                setIsSubmitting(false)

                if (pendingFlowRef.current?.auditMessageID) {
                  const auditMessageID = pendingFlowRef.current.auditMessageID

                  setInteractionMessages((currentMessages) =>
                    updateInteractionMessage(currentMessages, auditMessageID, (currentMessage) =>
                      currentMessage.type === 'audit'
                        ? {
                            ...currentMessage,
                            entries: failAuditEntries(currentMessage.entries),
                          }
                        : currentMessage,
                    ),
                  )
                }

                pendingFlowRef.current = null
                setPendingFlow(null)

                if (!event.message && event.error?.trim()) {
                  setSubmitError(event.error.trim())
                }
              }
            },
          },
        )
        activeStreamRef.current = connection
        await connection.done
      } catch (error: unknown) {
        if (!isActiveSubmission()) {
          return
        }

        const errorMessage =
          error instanceof Error && error.message.trim()
            ? error.message
            : `Unable to send backend conversation message for ${hostId}.`

        setMessages((currentMessages) =>
          finalizeAgentConversationStreamingMessages(currentMessages ?? [], errorMessage),
        )

        if (pendingFlowRef.current?.auditMessageID) {
          const auditMessageID = pendingFlowRef.current.auditMessageID

          setInteractionMessages((currentMessages) =>
            updateInteractionMessage(currentMessages, auditMessageID, (currentMessage) =>
              currentMessage.type === 'audit'
                ? {
                    ...currentMessage,
                    entries: failAuditEntries(currentMessage.entries),
                  }
                : currentMessage,
            ),
          )
        }

        pendingFlowRef.current = null
        setPendingFlow(null)
        setSubmitError(errorMessage)
      } finally {
        if (isActiveSubmission()) {
          if (activeStreamRef.current === connection) {
            activeStreamRef.current = null
          }

          unblockAiWidget(hostId)
          setIsSubmitting(false)
        }
      }
    },
    [hostId, nextLocalSortKey],
  )

  const panelState = useMemo(() => {
    let baseState: AiPanelWidgetState

    if (messages == null) {
      baseState = loadError ? createAgentPanelErrorState(loadError) : createAgentPanelLoadingState()
    } else {
      baseState = createAgentPanelStateFromMessages(messages, provider)
    }

    if (submitError) {
      baseState = prependAgentPanelStatusMessage(baseState, {
        id: 'agent-submit-error',
        content: submitError,
        meta: {
          reasoning: 'Route: POST /api/v1/agent/conversation/messages/stream',
          summary: 'Backend error',
        },
      })
    }

    return {
      ...baseState,
      messages: sortMessagesBySortKey([...interactionMessages, ...baseState.messages]),
    }
  }, [interactionMessages, loadError, messages, provider, submitError])

  return {
    answerQuestionnaire,
    approvePendingPlan,
    cancelPendingPlan,
    draft,
    isInteractionPending: pendingFlow != null,
    isSubmitting,
    panelState,
    setDraft,
    submitDraft,
  }
}
