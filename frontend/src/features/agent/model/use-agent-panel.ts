import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchAgentConversation,
  streamAgentConversationMessage,
  type AgentConversationMessage,
  type AgentConversationProvider,
  type AgentConversationStreamConnection,
} from '@/features/agent/api/client'
import { fetchAgentProviderCatalog, type AgentProviderView } from '@/features/agent/api/provider-client'
import {
  advanceAuditEntries,
  classifyMessageIntent,
  completeAuditEntries,
  createApprovalMessage,
  createAuditMessage,
  createPlanMessage,
  createPendingInteractionFlow,
  failAuditEntries,
  type PendingInteractionFlow,
  updateApprovalMessageStatus,
  updateQuestionnaireMessageAnswer,
} from '@/features/agent/model/interaction-flow'
import {
  appendAgentConversationMessage,
  appendAgentPanelStatusMessage,
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
  return [...messages].sort((left, right) => (left.sortKey ?? 0) - (right.sortKey ?? 0))
}

function upsertInteractionMessage(currentMessages: ChatMessageView[], nextMessage: ChatMessageView) {
  const messageIndex = currentMessages.findIndex((message) => message.id === nextMessage.id)

  if (messageIndex < 0) {
    return sortMessagesBySortKey([...currentMessages, nextMessage])
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

function directProviderChatModels(provider: AgentProviderView | null | undefined) {
  if (!provider) {
    return []
  }
  if (provider.kind === 'codex') {
    return provider.codex?.chat_models ?? []
  }
  if (provider.kind === 'claude') {
    return provider.claude?.chat_models ?? []
  }
  return []
}

function selectPreferredChatModel(
  currentModel: string,
  providerModel: string | undefined,
  availableModels: string[],
) {
  const selectedModel = currentModel.trim()
  if (selectedModel && availableModels.includes(selectedModel)) {
    return selectedModel
  }

  const activeProviderModel = providerModel?.trim() ?? ''
  if (activeProviderModel && availableModels.includes(activeProviderModel)) {
    return activeProviderModel
  }

  return availableModels[0] ?? ''
}

export function useAgentPanel(hostId: string, enabled = true) {
  const [messages, setMessages] = useState<AgentConversationMessage[] | null>(null)
  const [interactionMessages, setInteractionMessages] = useState<ChatMessageView[]>([])
  const [pendingFlow, setPendingFlow] = useState<PendingInteractionFlow | null>(null)
  const [provider, setProvider] = useState<AgentConversationProvider | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
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
    setAvailableModels([])
    setSelectedModel('')
    setLoadError(null)
    setSubmitError(null)
    setIsSubmitting(false)

    void Promise.allSettled([fetchAgentConversation(), fetchAgentProviderCatalog()]).then((results) => {
      if (cancelled) {
        return
      }

      const [conversationResult, providerCatalogResult] = results

      if (conversationResult.status === 'rejected') {
        const message =
          conversationResult.reason instanceof Error && conversationResult.reason.message.trim()
            ? conversationResult.reason.message
            : `Unable to load backend conversation for ${hostId}.`
        setLoadError(message)
      } else {
        setMessages(conversationResult.value.messages)
        setProvider(conversationResult.value.provider)
      }

      if (providerCatalogResult.status === 'fulfilled') {
        const activeProvider =
          providerCatalogResult.value.providers.find(
            (candidate) => candidate.id === providerCatalogResult.value.active_provider_id,
          ) ?? null
        const chatModels = directProviderChatModels(activeProvider)
        setAvailableModels(chatModels)
        setSelectedModel((currentModel) =>
          selectPreferredChatModel(
            currentModel,
            conversationResult.status === 'fulfilled' ? conversationResult.value.provider.model : undefined,
            chatModels,
          ),
        )
      }
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

  useEffect(() => {
    setSelectedModel((currentModel) =>
      selectPreferredChatModel(currentModel, provider?.model, availableModels),
    )
  }, [availableModels, provider?.model])

  const clearPendingInteractionFlow = useCallback(() => {
    pendingFlowRef.current = null
    setPendingFlow(null)
  }, [])

  const updateAuditMessageEntries = useCallback(
    (auditMessageID: string, update: Parameters<typeof updateInteractionMessage>[2]) => {
      setInteractionMessages((currentMessages) =>
        updateInteractionMessage(currentMessages, auditMessageID, update),
      )
    },
    [],
  )

  const runBackendPrompt = useCallback(
    async (prompt: string, options?: { auditMessageID?: string; model?: string }) => {
      const submissionNonce = submissionNonceRef.current + 1
      submissionNonceRef.current = submissionNonce
      const isActiveSubmission = () => submissionNonceRef.current === submissionNonce

      setIsSubmitting(true)
      setLoadError(null)
      setSubmitError(null)
      blockAiWidget(hostId)

      let auditProgressed = false
      let connection: AgentConversationStreamConnection | null = null

      try {
        const runtimeContext = await resolveRuntimeContext()

        connection = await streamAgentConversationMessage(
          {
            prompt,
            model: options?.model,
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

              setMessages((currentMessages) =>
                applyAgentConversationStreamEvent(currentMessages ?? [], event),
              )

              if (event.type === 'text-delta' && options?.auditMessageID && !auditProgressed) {
                updateAuditMessageEntries(options.auditMessageID, (currentMessage) =>
                  currentMessage.type === 'audit'
                    ? {
                        ...currentMessage,
                        entries: advanceAuditEntries(currentMessage.entries),
                      }
                    : currentMessage,
                )
                auditProgressed = true
              }

              if (event.type === 'message-complete') {
                if (options?.auditMessageID) {
                  updateAuditMessageEntries(options.auditMessageID, (currentMessage) =>
                    currentMessage.type === 'audit'
                      ? {
                          ...currentMessage,
                          entries: completeAuditEntries(currentMessage.entries),
                        }
                      : currentMessage,
                  )
                }
              } else if (event.type === 'error') {
                if (options?.auditMessageID) {
                  updateAuditMessageEntries(options.auditMessageID, (currentMessage) =>
                    currentMessage.type === 'audit'
                      ? {
                          ...currentMessage,
                          entries: failAuditEntries(currentMessage.entries),
                        }
                      : currentMessage,
                  )
                }

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

        if (options?.auditMessageID) {
          updateAuditMessageEntries(options.auditMessageID, (currentMessage) =>
            currentMessage.type === 'audit'
              ? {
                  ...currentMessage,
                  entries: failAuditEntries(currentMessage.entries),
                }
              : currentMessage,
          )
        }

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
    [hostId, updateAuditMessageEntries],
  )

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
      appendAgentConversationMessage(currentMessages ?? [], optimisticUserMessage),
    )
    setDraft('')

    if (interactionFlow.flow == null) {
      await runBackendPrompt(prompt, { model: selectedModel || undefined })
      return
    }

    setInteractionMessages((currentMessages) =>
      sortMessagesBySortKey([...currentMessages, ...interactionFlow.messages]),
    )
    pendingFlowRef.current = interactionFlow.flow
    setPendingFlow(interactionFlow.flow)
  }, [draft, enabled, hostId, isSubmitting, nextLocalSortKey, runBackendPrompt, selectedModel])

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
      clearPendingInteractionFlow()
    },
    [clearPendingInteractionFlow, nextLocalSortKey],
  )

  const answerQuestionnaire = useCallback(
    async (message: QuestionnaireMessage, answer: string) => {
      const activeFlow = pendingFlowRef.current

      if (!activeFlow || activeFlow.questionnaireMessageID !== message.id) {
        return
      }

      const answeredMessage = updateQuestionnaireMessageAnswer(message, answer, nextLocalSortKey)
      const classification = classifyMessageIntent(activeFlow.prompt, answer)

      if (classification.intent === 'chat') {
        setInteractionMessages((currentMessages) =>
          sortMessagesBySortKey([
            ...currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
            answeredMessage,
          ]),
        )
        clearPendingInteractionFlow()
        await runBackendPrompt(activeFlow.prompt, { model: selectedModel || undefined })
        return
      }

      const planMessage = createPlanMessage(
        activeFlow.flowID,
        activeFlow.prompt,
        classification.tools,
        nextLocalSortKey,
        answer,
      )
      const approvalMessage = createApprovalMessage(activeFlow.flowID, nextLocalSortKey)

      setInteractionMessages((currentMessages) =>
        sortMessagesBySortKey([
          ...currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
          answeredMessage,
          planMessage,
          approvalMessage,
        ]),
      )

      const nextFlow: PendingInteractionFlow = {
        ...activeFlow,
        approvalMessageID: approvalMessage.id,
        questionnaireMessageID: undefined,
        tools: classification.tools,
      }
      pendingFlowRef.current = nextFlow
      setPendingFlow(nextFlow)
    },
    [clearPendingInteractionFlow, nextLocalSortKey, runBackendPrompt, selectedModel],
  )

  const approvePendingPlan = useCallback(
    async (message: ApprovalMessage) => {
      const activeFlow = pendingFlowRef.current

      if (!activeFlow || activeFlow.flowID !== message.planId) {
        return
      }

      const approvedMessage = updateApprovalMessageStatus(message, 'approved', nextLocalSortKey)
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
          ...currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
          approvedMessage,
          auditMessage,
        ]),
      )
      clearPendingInteractionFlow()
      await runBackendPrompt(activeFlow.prompt, {
        auditMessageID: auditMessage.id,
        model: selectedModel || undefined,
      })
    },
    [clearPendingInteractionFlow, nextLocalSortKey, runBackendPrompt, selectedModel],
  )

  const panelState = useMemo(() => {
    let baseState: AiPanelWidgetState

    if (messages == null) {
      baseState = loadError ? createAgentPanelErrorState(loadError) : createAgentPanelLoadingState()
    } else {
      baseState = createAgentPanelStateFromMessages(messages, provider)
    }

    if (submitError) {
      baseState = appendAgentPanelStatusMessage(baseState, {
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
    availableModels,
    isInteractionPending: pendingFlow != null,
    isSubmitting,
    panelState,
    selectedModel,
    setDraft,
    setSelectedModel,
    submitDraft,
  }
}
