import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUnit } from 'effector-react'

import {
  archiveAgentConversation,
  activateAgentConversation,
  createAgentConversation,
  deleteAgentConversation,
  executeAgentTool,
  explainTerminalCommand,
  fetchAgentConversations,
  fetchAgentConversation,
  renameAgentConversation,
  restoreAgentConversation,
  streamAgentConversationMessage,
  type AgentAttachmentReference,
  type AgentConversationListCounts,
  type AgentConversationListScope,
  type AgentConversationMessage,
  type AgentConversationContextPreferences,
  type AgentConversationProvider,
  type AgentConversationSnapshot,
  type AgentConversationSummary,
  type AgentConversationStreamConnection,
  updateAgentConversationContext,
} from '@/features/agent/api/client'
import {
  fetchAgentProviderCatalog,
  setActiveAgentProvider as activateAgentProviderInCatalog,
  type AgentProviderCatalog,
  type AgentProviderView,
} from '@/features/agent/api/provider-client'
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
  AiProviderOption,
  ApprovalMessage,
  ChatMessageSortKey,
  ChatMessageView,
  QuestionnaireMessage,
} from '@/features/agent/model/types'
import { $terminalPanelBindings, resolveTerminalPanelBinding } from '@/features/terminal/model/panel-registry'
import { fetchTerminalSnapshot } from '@/features/terminal/api/client'
import { resolveRuntimeContext } from '@/shared/api/runtime'
import { fetchWorkspaceSnapshot, type WorkspaceWidgetSnapshot } from '@/shared/api/workspace'
import {
  $queuedAiAttachmentReferences,
  clearQueuedAiAttachmentReferences,
  removeQueuedAiAttachmentReference,
} from '@/shared/model/ai-attachments'
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
  attachments: AgentAttachmentReference[] = [],
): AgentConversationMessage {
  return {
    id: `agent-local-user-${hostId}-${sequence}`,
    role: 'user',
    content: prompt,
    attachments,
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
  if (provider.kind === 'openai-compatible') {
    return provider.openai_compatible?.chat_models ?? []
  }
  return []
}

function directProviderDefaultModel(provider: AgentProviderView | null | undefined) {
  if (!provider) {
    return ''
  }
  if (provider.kind === 'codex') {
    return provider.codex?.model?.trim() ?? ''
  }
  if (provider.kind === 'claude') {
    return provider.claude?.model?.trim() ?? ''
  }
  if (provider.kind === 'openai-compatible') {
    return provider.openai_compatible?.model?.trim() ?? ''
  }
  return ''
}

function providerOptionLabel(provider: AgentProviderView) {
  if (provider.display_name.trim()) {
    return provider.display_name.trim()
  }
  if (provider.kind === 'codex') {
    return 'Codex CLI'
  }
  if (provider.kind === 'claude') {
    return 'Claude Code CLI'
  }
  if (provider.kind === 'openai-compatible') {
    return 'OpenAI-Compatible HTTP'
  }
  return provider.id
}

function providerOptionsFromCatalog(catalog: AgentProviderCatalog | null): AiProviderOption[] {
  if (!catalog) {
    return []
  }

  return catalog.providers
    .filter((provider) => provider.enabled)
    .map((provider) => ({
      value: provider.id,
      label: providerOptionLabel(provider),
    }))
}

function providerViewToConversationProvider(
  provider: AgentProviderView | null | undefined,
  currentProvider: AgentConversationProvider | null,
): AgentConversationProvider | null {
  if (!provider) {
    return currentProvider
  }

  if (provider.kind === 'codex') {
    return {
      kind: provider.kind,
      base_url: provider.codex?.command ?? currentProvider?.base_url ?? '',
      model: provider.codex?.model ?? currentProvider?.model,
      streaming: false,
    }
  }
  if (provider.kind === 'claude') {
    return {
      kind: provider.kind,
      base_url: provider.claude?.command ?? currentProvider?.base_url ?? '',
      model: provider.claude?.model ?? currentProvider?.model,
      streaming: false,
    }
  }
  if (provider.kind === 'openai-compatible') {
    return {
      kind: provider.kind,
      base_url: provider.openai_compatible?.base_url ?? currentProvider?.base_url ?? '',
      model: provider.openai_compatible?.model ?? currentProvider?.model,
      streaming: false,
    }
  }
  return currentProvider
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
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

function formatContextWidgetGroup(widgetKind: string) {
  switch (widgetKind.trim().toLowerCase()) {
    case 'terminal':
      return 'Terminal widgets'
    case 'commander':
      return 'Commander widgets'
    case 'ai':
      return 'AI widgets'
    default: {
      const normalizedKind = widgetKind.trim()
      if (normalizedKind === '') {
        return 'Other widgets'
      }
      return `${normalizedKind.charAt(0).toUpperCase()}${normalizedKind.slice(1)} widgets`
    }
  }
}

function mapContextWidgetOptions(widgets: WorkspaceWidgetSnapshot[]): AiContextWidgetOption[] {
  return widgets.map((widget) => {
    const title = widget.title?.trim() || widget.id
    const metaParts = [widget.kind]

    if (widget.id !== title) {
      metaParts.unshift(widget.id)
    }
    if (widget.connection_id?.trim()) {
      metaParts.push(widget.connection_id.trim())
    }
    if (widget.path?.trim()) {
      metaParts.push(widget.path.trim())
    }

    return {
      group: formatContextWidgetGroup(widget.kind),
      value: widget.id,
      label: formatContextWidgetLabel(widget),
      title,
      meta: metaParts.join(' · '),
    }
  })
}

function filterContextWidgetSelection(selectedWidgetIDs: string[], widgetOptions: AiContextWidgetOption[]) {
  const availableWidgetIDs = new Set(widgetOptions.map((option) => option.value))
  return deduplicateWidgetIDs(selectedWidgetIDs).filter((widgetID) => availableWidgetIDs.has(widgetID))
}

function summaryFromConversationSnapshot(snapshot: AgentConversationSnapshot): AgentConversationSummary {
  return {
    archived_at: snapshot.archived_at,
    id: snapshot.id,
    title: snapshot.title,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
    message_count: snapshot.messages.length,
  }
}

function isCustomizedContextPreference(preferences: AgentConversationContextPreferences) {
  return !preferences.widget_context_enabled || (preferences.widget_ids?.length ?? 0) > 0
}

function sortConversationSummaries(conversations: AgentConversationSummary[]) {
  return [...conversations].sort((left, right) => {
    const leftArchivedAt = left.archived_at?.trim() ?? ''
    const rightArchivedAt = right.archived_at?.trim() ?? ''

    if (!leftArchivedAt && rightArchivedAt) {
      return -1
    }

    if (leftArchivedAt && !rightArchivedAt) {
      return 1
    }

    const leftSortKey = leftArchivedAt || left.updated_at
    const rightSortKey = rightArchivedAt || right.updated_at
    const updatedAtDelta = new Date(rightSortKey).getTime() - new Date(leftSortKey).getTime()

    if (updatedAtDelta !== 0) {
      return updatedAtDelta
    }

    return right.id.localeCompare(left.id)
  })
}

const defaultConversationListCounts: AgentConversationListCounts = {
  recent: 0,
  archived: 0,
  all: 0,
}

function upsertConversationSummary(
  conversations: AgentConversationSummary[],
  nextConversation: AgentConversationSummary,
) {
  const nextConversations = conversations.filter((conversation) => conversation.id !== nextConversation.id)
  nextConversations.push(nextConversation)
  return sortConversationSummaries(nextConversations)
}

export function useAgentPanel(hostId: string, enabled = true) {
  const [
    activeWidgetHostId,
    terminalPanelBindings,
    queuedAttachmentReferences,
    onRemoveQueuedAttachmentReference,
    onClearQueuedAttachmentReferences,
  ] = useUnit([
    $activeWidgetHostId,
    $terminalPanelBindings,
    $queuedAiAttachmentReferences,
    removeQueuedAiAttachmentReference,
    clearQueuedAiAttachmentReferences,
  ])
  const [messages, setMessages] = useState<AgentConversationMessage[] | null>(null)
  const [interactionMessages, setInteractionMessages] = useState<ChatMessageView[]>([])
  const [pendingFlow, setPendingFlow] = useState<PendingInteractionFlow | null>(null)
  const [provider, setProvider] = useState<AgentConversationProvider | null>(null)
  const [providerCatalog, setProviderCatalog] = useState<AgentProviderCatalog | null>(null)
  const [activeConversationSummary, setActiveConversationSummary] = useState<AgentConversationSummary | null>(
    null,
  )
  const [conversations, setConversations] = useState<AgentConversationSummary[]>([])
  const [conversationCounts, setConversationCounts] = useState<AgentConversationListCounts>(
    defaultConversationListCounts,
  )
  const [isConversationListPending, setIsConversationListPending] = useState(false)
  const [conversationSearchQuery, setConversationSearchQuery] = useState('')
  const [conversationScope, setConversationScope] = useState<AgentConversationListScope>('recent')
  const [activeConversationID, setActiveConversationID] = useState('')
  const [selectedProviderID, setSelectedProviderID] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [isWidgetContextEnabled, setIsWidgetContextEnabled] = useState(true)
  const [contextWidgetOptions, setContextWidgetOptions] = useState<AiContextWidgetOption[]>([])
  const [storedContextWidgetIDs, setStoredContextWidgetIDs] = useState<string[]>([])
  const [missingContextWidgetCount, setMissingContextWidgetCount] = useState(0)
  const [workspaceActiveWidgetID, setWorkspaceActiveWidgetID] = useState('')
  const [contextWidgetLoadError, setContextWidgetLoadError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResponseCancellable, setIsResponseCancellable] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isConversationPending, setIsConversationPending] = useState(false)
  const activeConversationIDRef = useRef('')
  const messagesRef = useRef<AgentConversationMessage[] | null>(null)
  const activeStreamRef = useRef<AgentConversationStreamConnection | null>(null)
  const activeSubmissionAbortRef = useRef<AbortController | null>(null)
  const activeAuditMessageIDRef = useRef<string | null>(null)
  const optimisticMessageCounterRef = useRef(0)
  const flowCounterRef = useRef(0)
  const localSortCounterRef = useRef(0)
  const pendingFlowRef = useRef<PendingInteractionFlow | null>(null)
  const submissionNonceRef = useRef(0)
  const panelStateEpochRef = useRef(0)
  const conversationListRequestNonceRef = useRef(0)
  const contextWidgetOptionsRef = useRef<AiContextWidgetOption[]>([])
  const storedContextWidgetIDsRef = useRef<string[]>([])
  const isWidgetContextEnabledRef = useRef(true)
  const workspaceActiveWidgetIDRef = useRef('')
  const hasLoadedContextWidgetsRef = useRef(false)
  const hasCustomizedContextWidgetSelectionRef = useRef(false)

  const nextLocalSortKey = useCallback((): ChatMessageSortKey => {
    const nextCounter = localSortCounterRef.current
    localSortCounterRef.current += 1
    return Date.now() * 1000 + nextCounter
  }, [])

  const beginPanelStateEpoch = useCallback(() => {
    panelStateEpochRef.current += 1
    return panelStateEpochRef.current
  }, [])

  const applyConversationContextPreferences = useCallback(
    (preferences: AgentConversationContextPreferences | undefined) => {
      const nextContextWidgetOptions = contextWidgetOptionsRef.current
      const normalizedWidgetIDs = deduplicateWidgetIDs(preferences?.widget_ids ?? [])
      const normalizedPreferences: AgentConversationContextPreferences = {
        widget_context_enabled: preferences?.widget_context_enabled ?? true,
        widget_ids: normalizedWidgetIDs,
      }
      hasCustomizedContextWidgetSelectionRef.current = isCustomizedContextPreference(normalizedPreferences)
      isWidgetContextEnabledRef.current = normalizedPreferences.widget_context_enabled
      storedContextWidgetIDsRef.current = normalizedWidgetIDs
      setIsWidgetContextEnabled(normalizedPreferences.widget_context_enabled)
      setStoredContextWidgetIDs(normalizedWidgetIDs)
      setMissingContextWidgetCount(
        nextContextWidgetOptions.length > 0
          ? Math.max(
              0,
              normalizedWidgetIDs.length -
                filterContextWidgetSelection(normalizedWidgetIDs, nextContextWidgetOptions).length,
            )
          : 0,
      )
    },
    [],
  )

  const applyConversationSnapshot = useCallback(
    (snapshot: AgentConversationSnapshot) => {
      const nextConversationSummary = summaryFromConversationSnapshot(snapshot)
      activeConversationIDRef.current = snapshot.id
      messagesRef.current = snapshot.messages
      setMessages(snapshot.messages)
      setProvider(snapshot.provider)
      setActiveConversationID(snapshot.id)
      setActiveConversationSummary(nextConversationSummary)
      applyConversationContextPreferences(snapshot.context_preferences)
      setConversations((currentConversations) =>
        upsertConversationSummary(currentConversations, nextConversationSummary),
      )
    },
    [applyConversationContextPreferences],
  )

  useEffect(() => {
    activeConversationIDRef.current = activeConversationID
  }, [activeConversationID])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    pendingFlowRef.current = pendingFlow
  }, [pendingFlow])

  useEffect(() => {
    contextWidgetOptionsRef.current = contextWidgetOptions
  }, [contextWidgetOptions])

  useEffect(() => {
    storedContextWidgetIDsRef.current = storedContextWidgetIDs
  }, [storedContextWidgetIDs])

  useEffect(() => {
    isWidgetContextEnabledRef.current = isWidgetContextEnabled
  }, [isWidgetContextEnabled])

  useEffect(() => {
    workspaceActiveWidgetIDRef.current = workspaceActiveWidgetID
  }, [workspaceActiveWidgetID])

  useEffect(() => {
    return () => {
      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      activeSubmissionAbortRef.current = null
      activeAuditMessageIDRef.current = null
      pendingFlowRef.current = null
      hasLoadedContextWidgetsRef.current = false
      hasCustomizedContextWidgetSelectionRef.current = false
      setIsResponseCancellable(false)
      unblockAiWidget(hostId)
    }
  }, [hostId])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    const panelStateEpoch = beginPanelStateEpoch()

    submissionNonceRef.current += 1
    activeSubmissionAbortRef.current?.abort()
    activeStreamRef.current?.close()
    activeStreamRef.current = null
    activeSubmissionAbortRef.current = null
    activeAuditMessageIDRef.current = null
    pendingFlowRef.current = null
    unblockAiWidget(hostId)
    setMessages(null)
    setInteractionMessages([])
    setPendingFlow(null)
    setProvider(null)
    setProviderCatalog(null)
    setActiveConversationSummary(null)
    setConversations([])
    setConversationCounts(defaultConversationListCounts)
    setIsConversationListPending(true)
    setConversationSearchQuery('')
    setConversationScope('recent')
    setActiveConversationID('')
    setSelectedProviderID('')
    setAvailableModels([])
    setSelectedModel('')
    setIsWidgetContextEnabled(true)
    setContextWidgetOptions([])
    setStoredContextWidgetIDs([])
    setMissingContextWidgetCount(0)
    setWorkspaceActiveWidgetID('')
    setContextWidgetLoadError(null)
    setLoadError(null)
    setSubmitError(null)
    setIsSubmitting(false)
    setIsResponseCancellable(false)
    setIsConversationPending(false)
    activeConversationIDRef.current = ''
    messagesRef.current = null
    hasLoadedContextWidgetsRef.current = false
    hasCustomizedContextWidgetSelectionRef.current = false

    void Promise.allSettled([fetchAgentConversation(), fetchAgentProviderCatalog()]).then((results) => {
      if (cancelled || panelStateEpochRef.current !== panelStateEpoch) {
        return
      }

      const [conversationResult, providerCatalogResult] = results

      if (conversationResult.status === 'rejected') {
        setLoadError(
          getErrorMessage(conversationResult.reason, `Unable to load backend conversation for ${hostId}.`),
        )
      } else {
        applyConversationSnapshot(conversationResult.value)
      }

      if (providerCatalogResult.status === 'fulfilled') {
        setProviderCatalog(providerCatalogResult.value)
        const activeProvider =
          providerCatalogResult.value.providers.find(
            (candidate) => candidate.id === providerCatalogResult.value.active_provider_id,
          ) ?? null
        const chatModels = directProviderChatModels(activeProvider)
        const providerModel =
          directProviderDefaultModel(activeProvider) ||
          (conversationResult.status === 'fulfilled' ? conversationResult.value.provider.model : undefined)

        setSelectedProviderID(activeProvider?.id ?? '')
        setAvailableModels(chatModels)
        setSelectedModel((currentModel) => selectPreferredChatModel(currentModel, providerModel, chatModels))
      }
    })

    return () => {
      cancelled = true
      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      activeSubmissionAbortRef.current = null
      activeAuditMessageIDRef.current = null
      pendingFlowRef.current = null
      hasLoadedContextWidgetsRef.current = false
      hasCustomizedContextWidgetSelectionRef.current = false
      setIsResponseCancellable(false)
      unblockAiWidget(hostId)
    }
  }, [applyConversationSnapshot, beginPanelStateEpoch, enabled, hostId])

  const refreshConversationList = useCallback(
    async (
      overrides: {
        query?: string
        scope?: AgentConversationListScope
      } = {},
    ) => {
      const requestNonce = conversationListRequestNonceRef.current + 1
      conversationListRequestNonceRef.current = requestNonce
      setIsConversationListPending(true)
      const nextQuery = overrides.query ?? conversationSearchQuery
      const nextScope = overrides.scope ?? conversationScope
      try {
        const conversationList = await fetchAgentConversations({
          query: nextQuery,
          scope: nextScope,
        })

        if (conversationListRequestNonceRef.current !== requestNonce) {
          return null
        }

        setConversations(sortConversationSummaries(conversationList.conversations))
        setConversationCounts(conversationList.counts)
        setActiveConversationID(
          (currentConversationID) => conversationList.active_conversation_id || currentConversationID || '',
        )
        return conversationList
      } finally {
        if (conversationListRequestNonceRef.current === requestNonce) {
          setIsConversationListPending(false)
        }
      }
    },
    [conversationScope, conversationSearchQuery],
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    void refreshConversationList({
      query: conversationSearchQuery,
      scope: conversationScope,
    }).catch((error) => {
      if (cancelled) {
        return
      }
      setSubmitError(getErrorMessage(error, 'Unable to refresh the conversation list.'))
    })

    return () => {
      cancelled = true
    }
  }, [conversationScope, conversationSearchQuery, enabled, refreshConversationList])

  useEffect(() => {
    setSelectedModel((currentModel) =>
      selectPreferredChatModel(currentModel, provider?.model, availableModels),
    )
  }, [availableModels, provider?.model])

  const clearPendingInteractionFlow = useCallback(() => {
    pendingFlowRef.current = null
    setPendingFlow(null)
  }, [])

  const resetConversationInteractionState = useCallback(() => {
    pendingFlowRef.current = null
    setPendingFlow(null)
    setInteractionMessages([])
    setSubmitError(null)
  }, [])

  const availableProviders = useMemo(() => providerOptionsFromCatalog(providerCatalog), [providerCatalog])

  const selectProvider = useCallback(
    async (providerID: string) => {
      const nextProviderID = providerID.trim()
      if (!nextProviderID || nextProviderID === selectedProviderID) {
        return
      }

      const panelStateEpoch = beginPanelStateEpoch()

      try {
        setLoadError(null)
        setSubmitError(null)

        const nextCatalog = await activateAgentProviderInCatalog(nextProviderID)
        if (panelStateEpochRef.current !== panelStateEpoch) {
          return
        }
        const nextProvider =
          nextCatalog.providers.find((candidate) => candidate.id === nextCatalog.active_provider_id) ?? null
        const nextModels = directProviderChatModels(nextProvider)

        setProviderCatalog(nextCatalog)
        setSelectedProviderID(nextProvider?.id ?? nextProviderID)
        setAvailableModels(nextModels)
        setSelectedModel(selectPreferredChatModel('', directProviderDefaultModel(nextProvider), nextModels))
        setProvider((currentProvider) => providerViewToConversationProvider(nextProvider, currentProvider))
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to switch the active AI provider.'))
      }
    },
    [beginPanelStateEpoch, selectedProviderID],
  )

  const switchConversation = useCallback(
    async (conversationID: string) => {
      const nextConversationID = conversationID.trim()
      if (
        !nextConversationID ||
        nextConversationID === activeConversationID ||
        isSubmitting ||
        isConversationPending
      ) {
        return
      }

      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      activeSubmissionAbortRef.current = null
      activeAuditMessageIDRef.current = null
      const panelStateEpoch = beginPanelStateEpoch()
      setIsConversationPending(true)

      try {
        const snapshot = await activateAgentConversation(nextConversationID)
        if (panelStateEpochRef.current !== panelStateEpoch) {
          return
        }
        applyConversationSnapshot(snapshot)
        resetConversationInteractionState()
        await refreshConversationList()
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to switch the active conversation.'))
      } finally {
        setIsConversationPending(false)
      }
    },
    [
      activeConversationID,
      applyConversationSnapshot,
      beginPanelStateEpoch,
      isConversationPending,
      isSubmitting,
      refreshConversationList,
      resetConversationInteractionState,
    ],
  )

  const createConversation = useCallback(async () => {
    if (isSubmitting || isConversationPending) {
      return
    }

    submissionNonceRef.current += 1
    activeSubmissionAbortRef.current?.abort()
    activeStreamRef.current?.close()
    activeStreamRef.current = null
    activeSubmissionAbortRef.current = null
    activeAuditMessageIDRef.current = null
    const panelStateEpoch = beginPanelStateEpoch()
    setIsConversationPending(true)

    try {
      const snapshot = await createAgentConversation()
      if (panelStateEpochRef.current !== panelStateEpoch) {
        return
      }
      applyConversationSnapshot(snapshot)
      resetConversationInteractionState()
      await refreshConversationList()
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Unable to create a new conversation.'))
    } finally {
      setIsConversationPending(false)
    }
  }, [
    applyConversationSnapshot,
    beginPanelStateEpoch,
    isConversationPending,
    isSubmitting,
    refreshConversationList,
    resetConversationInteractionState,
  ])

  const renameConversation = useCallback(
    async (conversationID: string, title: string) => {
      const nextConversationID = conversationID.trim()
      if (!nextConversationID || isSubmitting || isConversationPending) {
        return
      }

      setIsConversationPending(true)
      try {
        const snapshot = await renameAgentConversation(nextConversationID, title)
        applyConversationSnapshot(snapshot)
        void refreshConversationList().catch((error) => {
          setSubmitError(getErrorMessage(error, 'Unable to refresh the conversation list.'))
        })
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to rename the conversation.'))
      } finally {
        setIsConversationPending(false)
      }
    },
    [applyConversationSnapshot, isConversationPending, isSubmitting, refreshConversationList],
  )

  const deleteConversation = useCallback(
    async (conversationID: string) => {
      const nextConversationID = conversationID.trim()
      if (!nextConversationID || isSubmitting || isConversationPending) {
        return
      }

      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      activeSubmissionAbortRef.current = null
      activeAuditMessageIDRef.current = null
      const panelStateEpoch = beginPanelStateEpoch()
      setIsConversationPending(true)

      try {
        const snapshot = await deleteAgentConversation(nextConversationID)
        const conversationList = await fetchAgentConversations({
          query: conversationSearchQuery,
          scope: conversationScope,
        })
        if (panelStateEpochRef.current !== panelStateEpoch) {
          return
        }
        if (activeConversationID === nextConversationID) {
          applyConversationSnapshot(snapshot)
          resetConversationInteractionState()
        }
        setConversations(sortConversationSummaries(conversationList.conversations))
        setConversationCounts(conversationList.counts)
        setActiveConversationID(conversationList.active_conversation_id || snapshot.id)
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to delete the conversation.'))
      } finally {
        setIsConversationPending(false)
      }
    },
    [
      applyConversationSnapshot,
      activeConversationID,
      beginPanelStateEpoch,
      conversationScope,
      conversationSearchQuery,
      isConversationPending,
      isSubmitting,
      resetConversationInteractionState,
    ],
  )

  const archiveConversation = useCallback(
    async (conversationID: string) => {
      const nextConversationID = conversationID.trim()
      if (!nextConversationID || isSubmitting || isConversationPending) {
        return
      }

      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      activeSubmissionAbortRef.current = null
      activeAuditMessageIDRef.current = null
      const panelStateEpoch = beginPanelStateEpoch()
      setIsConversationPending(true)

      try {
        const snapshot = await archiveAgentConversation(nextConversationID)
        const conversationList = await fetchAgentConversations({
          query: conversationSearchQuery,
          scope: conversationScope,
        })
        if (panelStateEpochRef.current !== panelStateEpoch) {
          return
        }
        if (activeConversationID === nextConversationID) {
          applyConversationSnapshot(snapshot)
          resetConversationInteractionState()
        }
        setConversations(sortConversationSummaries(conversationList.conversations))
        setConversationCounts(conversationList.counts)
        setActiveConversationID(conversationList.active_conversation_id || snapshot.id)
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to archive the conversation.'))
      } finally {
        setIsConversationPending(false)
      }
    },
    [
      applyConversationSnapshot,
      activeConversationID,
      beginPanelStateEpoch,
      conversationScope,
      conversationSearchQuery,
      isConversationPending,
      isSubmitting,
      resetConversationInteractionState,
    ],
  )

  const restoreConversation = useCallback(
    async (conversationID: string) => {
      const nextConversationID = conversationID.trim()
      if (!nextConversationID || isSubmitting || isConversationPending) {
        return
      }

      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      activeStreamRef.current?.close()
      activeStreamRef.current = null
      activeSubmissionAbortRef.current = null
      activeAuditMessageIDRef.current = null
      const panelStateEpoch = beginPanelStateEpoch()
      setIsConversationPending(true)

      try {
        const snapshot = await restoreAgentConversation(nextConversationID)
        const conversationList = await fetchAgentConversations({
          query: conversationSearchQuery,
          scope: conversationScope,
        })
        if (panelStateEpochRef.current !== panelStateEpoch) {
          return
        }
        if (activeConversationID === nextConversationID) {
          applyConversationSnapshot(snapshot)
          resetConversationInteractionState()
        }
        setConversations(sortConversationSummaries(conversationList.conversations))
        setConversationCounts(conversationList.counts)
        setActiveConversationID(conversationList.active_conversation_id || snapshot.id)
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to restore the conversation.'))
      } finally {
        setIsConversationPending(false)
      }
    },
    [
      applyConversationSnapshot,
      activeConversationID,
      beginPanelStateEpoch,
      conversationScope,
      conversationSearchQuery,
      isConversationPending,
      isSubmitting,
      resetConversationInteractionState,
    ],
  )

  const updateConversationSearchQuery = useCallback((value: string) => {
    setConversationSearchQuery(value)
  }, [])

  const updateConversationScope = useCallback((value: AgentConversationListScope) => {
    setConversationScope(value)
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

  const resolveCurrentContextWidgetID = useCallback(
    (options: AiContextWidgetOption[], nextWorkspaceActiveWidgetID?: string) => {
      const availableWidgetIDs = new Set(options.map((option) => option.value))
      return (
        deriveFallbackContextWidgetIDs(nextWorkspaceActiveWidgetID).find((widgetID) =>
          availableWidgetIDs.has(widgetID),
        ) ?? ''
      )
    },
    [deriveFallbackContextWidgetIDs],
  )

  const effectiveContextWidgetIDs = useMemo(() => {
    const filteredSelection =
      contextWidgetOptions.length > 0
        ? filterContextWidgetSelection(storedContextWidgetIDs, contextWidgetOptions)
        : deduplicateWidgetIDs(storedContextWidgetIDs)

    if (filteredSelection.length > 0) {
      return filteredSelection
    }

    return deriveFallbackContextWidgetIDs()
  }, [contextWidgetOptions, deriveFallbackContextWidgetIDs, storedContextWidgetIDs])

  const resolvedMissingContextWidgetCount = useMemo(() => {
    if (contextWidgetOptions.length === 0) {
      return missingContextWidgetCount
    }

    const normalizedSelection = deduplicateWidgetIDs(storedContextWidgetIDs)
    return Math.max(
      0,
      normalizedSelection.length -
        filterContextWidgetSelection(normalizedSelection, contextWidgetOptions).length,
    )
  }, [contextWidgetOptions, missingContextWidgetCount, storedContextWidgetIDs])

  const ensureCurrentConversationSnapshotLoaded = useCallback(async () => {
    if (activeConversationIDRef.current.trim() && messagesRef.current != null) {
      return
    }

    const snapshot = await fetchAgentConversation()
    applyConversationSnapshot(snapshot)
    await refreshConversationList()
  }, [applyConversationSnapshot, refreshConversationList])

  const persistConversationContextPreferences = useCallback(
    async (preferences: AgentConversationContextPreferences) => {
      let conversationID = activeConversationIDRef.current.trim()

      if (!conversationID) {
        const currentSnapshot = await fetchAgentConversation()
        applyConversationSnapshot(currentSnapshot)
        conversationID = currentSnapshot.id.trim()
      }

      if (!conversationID) {
        return
      }

      const snapshot = await updateAgentConversationContext(conversationID, preferences)
      applyConversationSnapshot(snapshot)
      await refreshConversationList()
    },
    [applyConversationSnapshot, refreshConversationList],
  )

  const persistCleanedContextWidgetSelection = useCallback(
    async (options: AiContextWidgetOption[]) => {
      if (!hasCustomizedContextWidgetSelectionRef.current) {
        return false
      }

      const normalizedSelection = deduplicateWidgetIDs(storedContextWidgetIDsRef.current)
      if (normalizedSelection.length === 0) {
        return false
      }

      const cleanedWidgetIDs = filterContextWidgetSelection(normalizedSelection, options)
      if (cleanedWidgetIDs.length === normalizedSelection.length) {
        return false
      }

      storedContextWidgetIDsRef.current = cleanedWidgetIDs
      setStoredContextWidgetIDs(cleanedWidgetIDs)
      setMissingContextWidgetCount(0)
      await persistConversationContextPreferences({
        widget_context_enabled: isWidgetContextEnabledRef.current,
        widget_ids: cleanedWidgetIDs,
      })
      return true
    },
    [persistConversationContextPreferences],
  )

  const updateSelectedContextWidgetIDs = useCallback(
    (widgetIDs: string[]) => {
      const normalizedWidgetIDs = deduplicateWidgetIDs(widgetIDs)
      hasCustomizedContextWidgetSelectionRef.current = true
      setStoredContextWidgetIDs(normalizedWidgetIDs)
      setIsWidgetContextEnabled(true)
      setMissingContextWidgetCount(0)
      void persistConversationContextPreferences({
        widget_context_enabled: true,
        widget_ids: normalizedWidgetIDs,
      }).catch((error) => {
        setSubmitError(getErrorMessage(error, 'Unable to update the conversation context.'))
      })
    },
    [persistConversationContextPreferences],
  )

  const loadContextWidgets = useCallback(async () => {
    if (!enabled) {
      return {
        activeWidgetID: '',
        options: [] as AiContextWidgetOption[],
      }
    }
    if (hasLoadedContextWidgetsRef.current) {
      return {
        activeWidgetID: workspaceActiveWidgetIDRef.current,
        options: contextWidgetOptionsRef.current,
      }
    }

    const workspaceSnapshot = await fetchWorkspaceSnapshot()
    const nextContextWidgetOptions = mapContextWidgetOptions(workspaceSnapshot.widgets)
    const nextWorkspaceActiveWidgetID = workspaceSnapshot.active_widget_id?.trim() ?? ''

    hasLoadedContextWidgetsRef.current = true
    contextWidgetOptionsRef.current = nextContextWidgetOptions
    workspaceActiveWidgetIDRef.current = nextWorkspaceActiveWidgetID
    setWorkspaceActiveWidgetID(nextWorkspaceActiveWidgetID)
    setContextWidgetOptions(nextContextWidgetOptions)
    setContextWidgetLoadError(null)
    setMissingContextWidgetCount((currentMissingCount) => {
      if (hasCustomizedContextWidgetSelectionRef.current) {
        const normalizedSelection = deduplicateWidgetIDs(storedContextWidgetIDsRef.current)
        const filteredSelection = filterContextWidgetSelection(normalizedSelection, nextContextWidgetOptions)
        return Math.max(0, normalizedSelection.length - filteredSelection.length)
      }

      return currentMissingCount > 0 ? 0 : currentMissingCount
    })

    return {
      activeWidgetID: nextWorkspaceActiveWidgetID,
      options: nextContextWidgetOptions,
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || hasLoadedContextWidgetsRef.current) {
      return
    }

    const normalizedSelection = deduplicateWidgetIDs(storedContextWidgetIDs)
    if (normalizedSelection.length === 0) {
      return
    }

    let cancelled = false
    void loadContextWidgets().catch((error) => {
      if (cancelled) {
        return
      }
      const errorMessage =
        error instanceof Error && error.message.trim() ? error.message : 'Unable to load workspace widgets.'
      setContextWidgetLoadError(errorMessage)
    })

    return () => {
      cancelled = true
    }
  }, [enabled, loadContextWidgets, storedContextWidgetIDs])

  const handleContextOptionsOpen = useCallback(async () => {
    try {
      await ensureCurrentConversationSnapshotLoaded()
      const snapshot = await loadContextWidgets()
      await persistCleanedContextWidgetSelection(snapshot.options)
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim() ? error.message : 'Unable to load workspace widgets.'
      setContextWidgetLoadError(errorMessage)
    }
  }, [ensureCurrentConversationSnapshotLoaded, loadContextWidgets, persistCleanedContextWidgetSelection])

  const useCurrentContextWidget = useCallback(
    async (mode: 'append' | 'replace') => {
      try {
        const snapshot = await loadContextWidgets()
        const activeWidgetID = resolveCurrentContextWidgetID(snapshot.options, snapshot.activeWidgetID)

        if (!activeWidgetID) {
          return
        }

        hasCustomizedContextWidgetSelectionRef.current = true
        setIsWidgetContextEnabled(true)
        const nextWidgetIDs =
          mode === 'replace'
            ? [activeWidgetID]
            : deduplicateWidgetIDs([...effectiveContextWidgetIDs, activeWidgetID])
        setStoredContextWidgetIDs(nextWidgetIDs)
        setContextWidgetLoadError(null)
        setMissingContextWidgetCount(0)
        void persistConversationContextPreferences({
          widget_context_enabled: true,
          widget_ids: nextWidgetIDs,
        }).catch((persistError) => {
          setSubmitError(getErrorMessage(persistError, 'Unable to update the conversation context.'))
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message.trim() ? error.message : 'Unable to load workspace widgets.'
        setContextWidgetLoadError(errorMessage)
      }
    },
    [
      effectiveContextWidgetIDs,
      loadContextWidgets,
      persistConversationContextPreferences,
      resolveCurrentContextWidgetID,
    ],
  )

  const useAllContextWidgets = useCallback(async () => {
    try {
      const snapshot = await loadContextWidgets()
      const nextWidgetIDs = deduplicateWidgetIDs(snapshot.options.map((option) => option.value))

      hasCustomizedContextWidgetSelectionRef.current = true
      setIsWidgetContextEnabled(true)
      setStoredContextWidgetIDs(nextWidgetIDs)
      setContextWidgetLoadError(null)
      setMissingContextWidgetCount(0)
      void persistConversationContextPreferences({
        widget_context_enabled: true,
        widget_ids: nextWidgetIDs,
      }).catch((error) => {
        setSubmitError(getErrorMessage(error, 'Unable to update the conversation context.'))
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim() ? error.message : 'Unable to load workspace widgets.'
      setContextWidgetLoadError(errorMessage)
    }
  }, [loadContextWidgets, persistConversationContextPreferences])

  const resetContextWidgetSelection = useCallback(async () => {
    try {
      await loadContextWidgets()

      hasCustomizedContextWidgetSelectionRef.current = false
      setIsWidgetContextEnabled(true)
      setStoredContextWidgetIDs([])
      setContextWidgetLoadError(null)
      setMissingContextWidgetCount(0)
      void persistConversationContextPreferences({
        widget_context_enabled: true,
        widget_ids: [],
      }).catch((error) => {
        setSubmitError(getErrorMessage(error, 'Unable to update the conversation context.'))
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim() ? error.message : 'Unable to load workspace widgets.'
      setContextWidgetLoadError(errorMessage)
    }
  }, [loadContextWidgets, persistConversationContextPreferences])

  const activeContextWidgetID = useMemo(
    () => resolveCurrentContextWidgetID(contextWidgetOptions),
    [contextWidgetOptions, resolveCurrentContextWidgetID],
  )

  const activeContextWidgetOption = useMemo(() => {
    if (!activeContextWidgetID) {
      return null
    }

    return contextWidgetOptions.find((option) => option.value === activeContextWidgetID) ?? null
  }, [activeContextWidgetID, contextWidgetOptions])

  const updateWidgetContextEnabled = useCallback(
    (nextValue: boolean) => {
      setIsWidgetContextEnabled(nextValue)
      setMissingContextWidgetCount(0)
      hasCustomizedContextWidgetSelectionRef.current =
        !nextValue || deduplicateWidgetIDs(effectiveContextWidgetIDs).length > 0
      void persistConversationContextPreferences({
        widget_context_enabled: nextValue,
        widget_ids: deduplicateWidgetIDs(effectiveContextWidgetIDs),
      }).catch((error) => {
        setSubmitError(getErrorMessage(error, 'Unable to update the conversation context.'))
      })
    },
    [effectiveContextWidgetIDs, persistConversationContextPreferences],
  )

  const repairMissingContextWidgets = useCallback(() => {
    const nextWidgetIDs = deduplicateWidgetIDs(effectiveContextWidgetIDs)
    hasCustomizedContextWidgetSelectionRef.current = nextWidgetIDs.length > 0 || !isWidgetContextEnabled
    setStoredContextWidgetIDs(nextWidgetIDs)
    setMissingContextWidgetCount(0)
    void persistConversationContextPreferences({
      widget_context_enabled: isWidgetContextEnabled,
      widget_ids: nextWidgetIDs,
    }).catch((error) => {
      setSubmitError(getErrorMessage(error, 'Unable to save the cleaned conversation context.'))
    })
  }, [effectiveContextWidgetIDs, isWidgetContextEnabled, persistConversationContextPreferences])

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

      applyConversationSnapshot(explainResponse.conversation)
      await refreshConversationList()

      if (explainResponse.provider_error?.trim()) {
        setSubmitError(explainResponse.provider_error.trim())
      }

      return true
    },
    [
      activeWidgetHostId,
      applyConversationSnapshot,
      createConversationContext,
      refreshConversationList,
      terminalPanelBindings,
    ],
  )

  const runBackendPrompt = useCallback(
    async (
      prompt: string,
      options?: {
        attachments?: AgentAttachmentReference[]
        auditMessageID?: string
        cancellable?: boolean
        model?: string
      },
    ) => {
      const submissionNonce = submissionNonceRef.current + 1
      submissionNonceRef.current = submissionNonce
      const isActiveSubmission = () => submissionNonceRef.current === submissionNonce
      const isCancellable = options?.cancellable !== false

      setIsSubmitting(true)
      setIsResponseCancellable(isCancellable)
      setLoadError(null)
      setSubmitError(null)
      blockAiWidget(hostId)

      const submissionAbortController = new AbortController()
      let auditProgressed = false
      let streamErrored = false
      let connection: AgentConversationStreamConnection | null = null
      activeSubmissionAbortRef.current = submissionAbortController
      activeAuditMessageIDRef.current = options?.auditMessageID ?? null

      try {
        const runtimeContext = await resolveRuntimeContext()

        if (await runTerminalPrompt(prompt, runtimeContext.repoRoot)) {
          return
        }

        connection = await streamAgentConversationMessage(
          {
            prompt,
            attachments: options?.attachments,
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
                streamErrored = true

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
            signal: submissionAbortController.signal,
          },
        )
        if (!isActiveSubmission()) {
          connection.close()
          return
        }
        activeStreamRef.current = connection
        await connection.done

        if (isActiveSubmission() && !streamErrored) {
          const [snapshot] = await Promise.all([fetchAgentConversation(), refreshConversationList()])
          applyConversationSnapshot(snapshot)
        }
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
          if (activeSubmissionAbortRef.current === submissionAbortController) {
            activeSubmissionAbortRef.current = null
          }
          if (activeAuditMessageIDRef.current === (options?.auditMessageID ?? null)) {
            activeAuditMessageIDRef.current = null
          }

          unblockAiWidget(hostId)
          setIsSubmitting(false)
          setIsResponseCancellable(false)
        }
      }
    },
    [
      applyConversationSnapshot,
      hostId,
      refreshConversationList,
      runTerminalPrompt,
      updateAuditMessageEntries,
    ],
  )

  const submitDraft = useCallback(async () => {
    const prompt = draft.trim()

    if (!enabled || isSubmitting || isConversationPending || pendingFlowRef.current || prompt === '') {
      return
    }
    const isRunPrompt = getRunCommand(prompt) !== null
    const attachmentsForPrompt = isRunPrompt ? [] : [...queuedAttachmentReferences]
    const promptAttachments = attachmentsForPrompt.length > 0 ? attachmentsForPrompt : undefined

    const optimisticUserMessage = createOptimisticUserConversationMessage(
      hostId,
      optimisticMessageCounterRef.current,
      prompt,
      attachmentsForPrompt,
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
    if (!isRunPrompt) {
      onClearQueuedAttachmentReferences()
    }

    if (isRunPrompt) {
      await runBackendPrompt(prompt, { cancellable: false })
      return
    }

    if (interactionFlow.flow == null) {
      await runBackendPrompt(prompt, {
        attachments: promptAttachments,
        model: selectedModel || undefined,
      })
      return
    }

    const nextPendingFlow = {
      ...interactionFlow.flow,
      attachments: promptAttachments,
    }
    setInteractionMessages((currentMessages) =>
      sortMessagesBySortKey([...currentMessages, ...interactionFlow.messages]),
    )
    pendingFlowRef.current = nextPendingFlow
    setPendingFlow(nextPendingFlow)
  }, [
    draft,
    enabled,
    hostId,
    isConversationPending,
    isSubmitting,
    nextLocalSortKey,
    onClearQueuedAttachmentReferences,
    queuedAttachmentReferences,
    runBackendPrompt,
    selectedModel,
  ])

  const cancelActiveSubmission = useCallback(() => {
    if (!isSubmitting && !activeStreamRef.current && !activeSubmissionAbortRef.current) {
      return
    }

    const cancellationMessage = 'Response cancelled by operator.'
    const nextSubmissionNonce = submissionNonceRef.current + 1
    const auditMessageID = activeAuditMessageIDRef.current

    submissionNonceRef.current = nextSubmissionNonce
    activeSubmissionAbortRef.current?.abort()
    activeStreamRef.current?.close()
    activeStreamRef.current = null
    activeSubmissionAbortRef.current = null
    activeAuditMessageIDRef.current = null

    if (auditMessageID) {
      updateAuditMessageEntries(auditMessageID, (currentMessage) =>
        currentMessage.type === 'audit'
          ? {
              ...currentMessage,
              entries: failAuditEntries(currentMessage.entries),
            }
          : currentMessage,
      )
    }

    setMessages((currentMessages) => {
      const messagesBeforeCancel = currentMessages ?? []
      const hadStreamingMessage = messagesBeforeCancel.some((message) => message.status === 'streaming')
      const finalizedMessages = finalizeAgentConversationStreamingMessages(
        messagesBeforeCancel,
        cancellationMessage,
      )

      if (hadStreamingMessage) {
        return finalizedMessages
      }

      return appendAgentConversationMessage(finalizedMessages, {
        id: `agent-local-cancelled-${hostId}-${nextSubmissionNonce}`,
        role: 'assistant',
        content: cancellationMessage,
        status: 'error',
        created_at: new Date().toISOString(),
      })
    })
    setSubmitError(null)
    setIsSubmitting(false)
    setIsResponseCancellable(false)
    unblockAiWidget(hostId)
  }, [hostId, isSubmitting, updateAuditMessageEntries])

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
        await runBackendPrompt(activeFlow.prompt, {
          attachments: activeFlow.attachments,
          model: selectedModel || undefined,
        })
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
        attachments: activeFlow.attachments,
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
        attachments: activeFlow.attachments,
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
    activeConversationID,
    activeConversationSummary,
    answerQuestionnaire,
    approvePendingPlan,
    availableProviders,
    cancelActiveSubmission,
    contextWidgetLoadError,
    contextWidgetOptions,
    cancelPendingPlan,
    draft,
    availableModels,
    activeContextWidgetID,
    activeContextWidgetOption,
    archiveConversation,
    conversationCounts,
    conversationScope,
    conversationSearchQuery,
    handleContextOptionsOpen,
    missingContextWidgetCount: resolvedMissingContextWidgetCount,
    conversations,
    createConversation,
    isInteractionPending: pendingFlow != null,
    isConversationListPending,
    isConversationPending,
    isResponseCancellable,
    isSubmitting,
    isWidgetContextEnabled,
    panelState,
    queuedAttachmentReferences,
    removeQueuedAttachmentReference: onRemoveQueuedAttachmentReference,
    selectedContextWidgetIDs: effectiveContextWidgetIDs,
    selectedModel,
    selectedProviderID,
    selectProvider,
    setDraft,
    setIsWidgetContextEnabled: updateWidgetContextEnabled,
    setSelectedModel,
    setSelectedContextWidgetIDs: updateSelectedContextWidgetIDs,
    switchConversation,
    deleteConversation,
    renameConversation,
    setConversationScope: updateConversationScope,
    setConversationSearchQuery: updateConversationSearchQuery,
    repairMissingContextWidgets,
    resetContextWidgetSelection,
    restoreConversation,
    useAllContextWidgets,
    useCurrentContextWidget,
    submitDraft,
  }
}

export type AgentPanelController = ReturnType<typeof useAgentPanel>
