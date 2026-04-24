import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUnit } from 'effector-react'

import {
  executeAgentTool,
  explainTerminalCommand,
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
  AiContextWidgetOption,
  ApprovalMessage,
  ChatMessageSortKey,
  ChatMessageView,
  QuestionnaireMessage,
} from '@/features/agent/model/types'
import { $terminalPanelBindings, resolveTerminalPanelBinding } from '@/features/terminal/model/panel-registry'
import { fetchTerminalSnapshot } from '@/features/terminal/api/client'
import { resolveRuntimeContext } from '@/shared/api/runtime'
import { fetchWorkspaceSnapshot, type WorkspaceWidgetSnapshot } from '@/shared/api/workspace'
import { blockAiWidget, unblockAiWidget } from '@/shared/model/ai-blocked-widgets'
import { $activeWidgetHostId } from '@/shared/model/widget-focus'

const runCommandPattern = /^\/run(?:\s+([\s\S]*))?$/
const runOutputPollIntervalMs = 100
const runOutputWaitTimeoutMs = 1500

function getRunCommand(prompt: string) {
  const match = prompt.match(runCommandPattern)

  if (!match) {
    return null
  }

  return match[1]?.trim() ?? ''
}

function targetSessionForConnectionKind(connectionKind: string | undefined) {
  return connectionKind === 'ssh' ? 'remote' : 'local'
}

async function waitForTerminalOutput(widgetId: string, fromSeq: number) {
  const deadline = Date.now() + runOutputWaitTimeoutMs
  let latestSnapshot = await fetchTerminalSnapshot(widgetId, fromSeq)

  while (latestSnapshot.next_seq <= fromSeq && latestSnapshot.chunks.length === 0 && Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, runOutputPollIntervalMs))
    latestSnapshot = await fetchTerminalSnapshot(widgetId, fromSeq)
  }

  return latestSnapshot
}

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

function deduplicateWidgetIDs(widgetIDs: string[]) {
  return widgetIDs.reduce<string[]>((accumulator, widgetID) => {
    const trimmedWidgetID = widgetID.trim()

    if (!trimmedWidgetID || accumulator.includes(trimmedWidgetID)) {
      return accumulator
    }

    return [...accumulator, trimmedWidgetID]
  }, [])
}

function formatContextWidgetLabel(widget: WorkspaceWidgetSnapshot) {
  const title = widget.title?.trim() || widget.id
  const meta = [widget.kind]

  if (widget.connection_id?.trim()) {
    meta.push(widget.connection_id.trim())
  }
  if (widget.path?.trim()) {
    meta.push(widget.path.trim())
  }

  return title === widget.id
    ? `${title} · ${meta.join(' · ')}`
    : `${title} (${widget.id}) · ${meta.join(' · ')}`
}

function mapContextWidgetOptions(widgets: WorkspaceWidgetSnapshot[]): AiContextWidgetOption[] {
  return widgets.map((widget) => ({
    value: widget.id,
    label: formatContextWidgetLabel(widget),
  }))
}

function filterContextWidgetSelection(selectedWidgetIDs: string[], widgetOptions: AiContextWidgetOption[]) {
  const availableWidgetIDs = new Set(widgetOptions.map((option) => option.value))
  return deduplicateWidgetIDs(selectedWidgetIDs).filter((widgetID) => availableWidgetIDs.has(widgetID))
}

export function useAgentPanel(hostId: string, enabled = true) {
  const [activeWidgetHostId, terminalPanelBindings] = useUnit([$activeWidgetHostId, $terminalPanelBindings])
  const [messages, setMessages] = useState<AgentConversationMessage[] | null>(null)
  const [interactionMessages, setInteractionMessages] = useState<ChatMessageView[]>([])
  const [pendingFlow, setPendingFlow] = useState<PendingInteractionFlow | null>(null)
  const [provider, setProvider] = useState<AgentConversationProvider | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [isWidgetContextEnabled, setIsWidgetContextEnabled] = useState(true)
  const [contextWidgetOptions, setContextWidgetOptions] = useState<AiContextWidgetOption[]>([])
  const [selectedContextWidgetIDs, setSelectedContextWidgetIDs] = useState<string[]>([])
  const [workspaceActiveWidgetID, setWorkspaceActiveWidgetID] = useState('')
  const [contextWidgetLoadError, setContextWidgetLoadError] = useState<string | null>(null)
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
  const hasLoadedContextWidgetsRef = useRef(false)
  const hasCustomizedContextWidgetSelectionRef = useRef(false)

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
      hasLoadedContextWidgetsRef.current = false
      hasCustomizedContextWidgetSelectionRef.current = false
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
    setIsWidgetContextEnabled(true)
    setContextWidgetOptions([])
    setSelectedContextWidgetIDs([])
    setWorkspaceActiveWidgetID('')
    setContextWidgetLoadError(null)
    setLoadError(null)
    setSubmitError(null)
    setIsSubmitting(false)
    hasLoadedContextWidgetsRef.current = false
    hasCustomizedContextWidgetSelectionRef.current = false

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
      hasLoadedContextWidgetsRef.current = false
      hasCustomizedContextWidgetSelectionRef.current = false
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

  const deriveFallbackContextWidgetIDs = useCallback(
    (nextWorkspaceActiveWidgetID?: string) => {
      const terminalBinding = resolveTerminalPanelBinding(terminalPanelBindings, activeWidgetHostId)
      return deduplicateWidgetIDs([
        terminalBinding?.runtimeWidgetId ?? '',
        nextWorkspaceActiveWidgetID ?? workspaceActiveWidgetID,
      ])
    },
    [activeWidgetHostId, terminalPanelBindings, workspaceActiveWidgetID],
  )

  const effectiveContextWidgetIDs = useMemo(() => {
    const filteredSelection =
      contextWidgetOptions.length > 0
        ? filterContextWidgetSelection(selectedContextWidgetIDs, contextWidgetOptions)
        : deduplicateWidgetIDs(selectedContextWidgetIDs)

    if (filteredSelection.length > 0) {
      return filteredSelection
    }

    return deriveFallbackContextWidgetIDs()
  }, [contextWidgetOptions, deriveFallbackContextWidgetIDs, selectedContextWidgetIDs])

  const updateSelectedContextWidgetIDs = useCallback((widgetIDs: string[]) => {
    hasCustomizedContextWidgetSelectionRef.current = true
    setSelectedContextWidgetIDs(deduplicateWidgetIDs(widgetIDs))
  }, [])

  const loadContextWidgets = useCallback(async () => {
    if (!enabled) {
      return
    }
    if (hasLoadedContextWidgetsRef.current) {
      return
    }

    const workspaceSnapshot = await fetchWorkspaceSnapshot()
    const nextContextWidgetOptions = mapContextWidgetOptions(workspaceSnapshot.widgets)

    hasLoadedContextWidgetsRef.current = true
    setWorkspaceActiveWidgetID(workspaceSnapshot.active_widget_id?.trim() ?? '')
    setContextWidgetOptions(nextContextWidgetOptions)
    setContextWidgetLoadError(null)
    setSelectedContextWidgetIDs((currentSelection) => {
      if (hasCustomizedContextWidgetSelectionRef.current) {
        return filterContextWidgetSelection(currentSelection, nextContextWidgetOptions)
      }

      return deriveFallbackContextWidgetIDs(workspaceSnapshot.active_widget_id)
    })
  }, [deriveFallbackContextWidgetIDs, enabled])

  const handleContextOptionsOpen = useCallback(async () => {
    try {
      await loadContextWidgets()
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim() ? error.message : 'Unable to load workspace widgets.'
      setContextWidgetLoadError(errorMessage)
    }
  }, [loadContextWidgets])

  const createConversationContext = useCallback(
    (input: {
      actionSource: string
      activeWidgetID?: string
      repoRoot: string
      targetConnectionID?: string
      targetSession?: string
      includeActiveWidgetInSelection?: boolean
    }) => {
      const selectedWidgetIDs = isWidgetContextEnabled ? effectiveContextWidgetIDs : []
      const activeWidgetID =
        input.activeWidgetID?.trim() || selectedWidgetIDs[0] || deriveFallbackContextWidgetIDs()[0] || ''
      const contextWidgetIDs = isWidgetContextEnabled
        ? deduplicateWidgetIDs(
            input.includeActiveWidgetInSelection && activeWidgetID
              ? [activeWidgetID, ...selectedWidgetIDs]
              : selectedWidgetIDs,
          )
        : []

      return {
        action_source: input.actionSource,
        active_widget_id: activeWidgetID,
        repo_root: input.repoRoot,
        target_connection_id: input.targetConnectionID,
        target_session: input.targetSession,
        widget_context_enabled: isWidgetContextEnabled,
        ...(contextWidgetIDs.length > 0 ? { widget_ids: contextWidgetIDs } : {}),
      }
    },
    [deriveFallbackContextWidgetIDs, effectiveContextWidgetIDs, isWidgetContextEnabled],
  )

  const runTerminalPrompt = useCallback(
    async (prompt: string, repoRoot: string) => {
      const command = getRunCommand(prompt)

      if (command == null) {
        return false
      }

      if (command === '') {
        throw new Error('Usage: /run <command>')
      }

      const targetTerminal = resolveTerminalPanelBinding(terminalPanelBindings, activeWidgetHostId)

      if (!targetTerminal) {
        throw new Error('No terminal widget is available for /run.')
      }

      const baselineSnapshot = await fetchTerminalSnapshot(targetTerminal.runtimeWidgetId)
      const targetSession = targetSessionForConnectionKind(baselineSnapshot.state.connection_kind)
      const targetConnectionId =
        baselineSnapshot.state.connection_id?.trim() || (targetSession === 'local' ? 'local' : '')

      if (!targetConnectionId) {
        throw new Error(`Terminal ${targetTerminal.runtimeWidgetId} has no active connection id.`)
      }

      const executionContext = {
        action_source: 'frontend.ai.sidebar.run',
        active_widget_id: targetTerminal.runtimeWidgetId,
        repo_root: repoRoot,
        target_connection_id: targetConnectionId,
        target_session: targetSession,
      }

      const executionResponse = await executeAgentTool({
        context: executionContext,
        input: {
          append_newline: true,
          text: command,
          widget_id: targetTerminal.runtimeWidgetId,
        },
        tool_name: 'term.send_input',
      })

      if (executionResponse.status === 'requires_confirmation') {
        throw new Error(
          executionResponse.pending_approval?.summary
            ? `Confirmation required before /run can continue: ${executionResponse.pending_approval.summary}`
            : 'Confirmation required before /run can continue.',
        )
      }

      if (executionResponse.status !== 'ok') {
        throw new Error(executionResponse.error?.trim() || 'Unable to execute /run command.')
      }

      await waitForTerminalOutput(targetTerminal.runtimeWidgetId, baselineSnapshot.next_seq)

      const explainResponse = await explainTerminalCommand({
        command,
        context: createConversationContext({
          actionSource: executionContext.action_source,
          activeWidgetID: targetTerminal.runtimeWidgetId,
          includeActiveWidgetInSelection: true,
          repoRoot: repoRoot,
          targetConnectionID: targetConnectionId,
          targetSession: targetSession,
        }),
        from_seq: baselineSnapshot.next_seq,
        prompt,
        widget_id: targetTerminal.runtimeWidgetId,
      })

      setMessages(explainResponse.conversation.messages)
      setProvider(explainResponse.conversation.provider)

      if (explainResponse.provider_error?.trim()) {
        setSubmitError(explainResponse.provider_error.trim())
      }

      return true
    },
    [activeWidgetHostId, createConversationContext, terminalPanelBindings],
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

        if (await runTerminalPrompt(prompt, runtimeContext.repoRoot)) {
          return
        }

        connection = await streamAgentConversationMessage(
          {
            prompt,
            model: options?.model,
            context: createConversationContext({
              actionSource: 'frontend.ai.sidebar',
              repoRoot: runtimeContext.repoRoot,
            }),
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
    [hostId, runTerminalPrompt, updateAuditMessageEntries],
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

    if (getRunCommand(prompt) !== null) {
      await runBackendPrompt(prompt)
      return
    }

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
    contextWidgetLoadError,
    contextWidgetOptions,
    cancelPendingPlan,
    draft,
    availableModels,
    handleContextOptionsOpen,
    isInteractionPending: pendingFlow != null,
    isSubmitting,
    isWidgetContextEnabled,
    panelState,
    selectedContextWidgetIDs: effectiveContextWidgetIDs,
    selectedModel,
    setDraft,
    setIsWidgetContextEnabled,
    setSelectedModel,
    setSelectedContextWidgetIDs: updateSelectedContextWidgetIDs,
    submitDraft,
  }
}
