import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUnit } from 'effector-react'

import {
  deleteAgentAttachmentReference,
  fetchAgentAttachmentReferences,
  fetchAgentCatalog,
  setAgentMode,
  setAgentProfile,
  setAgentRole,
  type AgentCatalog,
  type AgentAttachmentReference,
  type AgentConversationListCounts,
  type AgentConversationListScope,
  type AgentConversationMessage,
  type AgentConversationContextPreferences,
  type AgentConversationProvider,
  type AgentConversationSnapshot,
  type AgentConversationSummary,
  type AgentToolExecuteResponse,
} from '@/features/agent/api/client'
import {
  fetchAgentProviderCatalog,
  fetchAgentProviderGatewaySnapshot,
  type AgentProviderCatalog,
  type AgentProviderGatewayProvider,
  type AgentProviderGatewayRun,
  type AgentProviderGatewaySnapshot,
} from '@/features/agent/api/provider-client'
import {
  createPendingInteractionFlow,
  type PendingRunApproval,
  type PendingInteractionFlow,
  updateApprovalMessageStatus,
} from '@/features/agent/model/interaction-flow'
import {
  answerQuestionnaireForPanel,
  approvePendingPlanForPanel,
} from '@/features/agent/model/agent-panel-approval'
import {
  deduplicateWidgetIDs,
  filterContextWidgetSelection,
  formatContextWidgetLabel,
  isCustomizedContextPreference,
  resolveContextTerminalWidget,
  summaryFromConversationSnapshot,
  upsertConversationSummary,
} from '@/features/agent/model/agent-panel-context'
import {
  ensureCurrentConversationSnapshotLoadedForPanel,
  loadContextWidgetsForPanel,
  persistCleanedContextWidgetSelectionForPanel,
  persistConversationContextPreferencesForPanel,
} from '@/features/agent/model/agent-panel-context-runtime'
import {
  resolveTerminalExecutionTargetForPanel,
  runApprovedExecutionPlanForPanel,
  runApprovedTerminalPromptForPanel,
  runTerminalPromptForPanel,
  type TerminalExecutionTarget,
} from '@/features/agent/model/agent-panel-execution'
import {
  cancelActiveSubmissionForPanel,
  runBackendPromptForPanel,
} from '@/features/agent/model/agent-panel-streaming'
import {
  bootstrapAgentPanel,
  resetAgentPanelBootstrapState,
  resetAgentPanelRuntime,
} from '@/features/agent/model/agent-panel-bootstrap'
import {
  archiveConversationForPanel,
  createConversationForPanel,
  deleteConversationForPanel,
  refreshConversationListForPanel,
  renameConversationForPanel,
  resetConversationSubmissionRuntime,
  restoreConversationForPanel,
  switchConversationForPanel,
} from '@/features/agent/model/agent-panel-conversations'
import {
  appendAgentConversationMessage,
  appendAgentPanelStatusMessage,
  createAgentPanelErrorState,
  createAgentPanelLoadingState,
  createAgentPanelStateFromMessages,
} from '@/features/agent/model/panel-state'
import {
  providerOptionsFromCatalog,
  selectPreferredChatModel,
} from '@/features/agent/model/agent-panel-provider'
import {
  clearActiveProviderRouteStateForPanel,
  prewarmActiveProviderRouteForPanel,
  probeActiveProviderRouteForPanel,
  refreshActiveProviderHistoryForPanel,
  refreshProviderGatewaySnapshotForPanel,
  resolveActiveProviderGateway,
  selectProviderForPanel,
} from '@/features/agent/model/agent-panel-provider-runtime'
import {
  createOptimisticUserConversationMessage,
  sortMessagesBySortKey,
  updateInteractionMessage,
  upsertInteractionMessage,
} from '@/features/agent/model/chat-message-utils'
import {
  agentSelectionOptionsFromItems,
  getErrorMessage,
  getRunCommand,
} from '@/features/agent/model/agent-panel-terminal'
import type {
  AiAgentSelectionOption,
  AiPanelWidgetState,
  AiContextWidgetOption,
  AiProviderOption,
  ApprovalMessage,
  ChatMessageSortKey,
  ChatMessageView,
  QuestionnaireMessage,
} from '@/features/agent/model/types'
import { $terminalPanelBindings } from '@/features/terminal/model/panel-registry'
import { resolveRuntimeContext } from '@/shared/api/runtime'
import type { WorkspaceWidgetSnapshot } from '@/shared/api/workspace'
import {
  $queuedAiAttachmentReferences,
  clearQueuedAiAttachmentReferences,
  queueAiAttachmentReference,
  removeQueuedAiAttachmentReference,
} from '@/shared/model/ai-attachments'
import { blockAiWidget, unblockAiWidget } from '@/shared/model/ai-blocked-widgets'
import { $activeWidgetHostId } from '@/shared/model/widget-focus'

type UseAgentPanelOptions = {
  ensureVisibleTerminalTarget?: (input: {
    requestedWidgetId?: string
    requestedWidgetTitle?: string
  }) => Promise<{
    widgetId: string
  } | null>
}

const defaultConversationListCounts: AgentConversationListCounts = {
  recent: 0,
  archived: 0,
  all: 0,
}

export function useAgentPanel(hostId: string, enabled = true, options: UseAgentPanelOptions = {}) {
  const [
    activeWidgetHostId,
    terminalPanelBindings,
    queuedAttachmentReferences,
    onQueueAiAttachmentReference,
    onRemoveQueuedAttachmentReference,
    onClearQueuedAttachmentReferences,
  ] = useUnit([
    $activeWidgetHostId,
    $terminalPanelBindings,
    $queuedAiAttachmentReferences,
    queueAiAttachmentReference,
    removeQueuedAiAttachmentReference,
    clearQueuedAiAttachmentReferences,
  ])
  const [messages, setMessages] = useState<AgentConversationMessage[] | null>(null)
  const [interactionMessages, setInteractionMessages] = useState<ChatMessageView[]>([])
  const [pendingFlow, setPendingFlow] = useState<PendingInteractionFlow | null>(null)
  const [provider, setProvider] = useState<AgentConversationProvider | null>(null)
  const [providerCatalog, setProviderCatalog] = useState<AgentProviderCatalog | null>(null)
  const [providerGateway, setProviderGateway] = useState<AgentProviderGatewaySnapshot | null>(null)
  const [activeProviderHistoryRuns, setActiveProviderHistoryRuns] = useState<AgentProviderGatewayRun[]>([])
  const [activeProviderHistoryTotal, setActiveProviderHistoryTotal] = useState(0)
  const [activeProviderHistoryError, setActiveProviderHistoryError] = useState<string | null>(null)
  const [agentCatalog, setAgentCatalog] = useState<AgentCatalog | null>(null)
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
  const [isAttachmentLibraryPending, setIsAttachmentLibraryPending] = useState(false)
  const [isProviderGatewayPending, setIsProviderGatewayPending] = useState(false)
  const [isActiveProviderHistoryPending, setIsActiveProviderHistoryPending] = useState(false)
  const [isProviderRouteProbing, setIsProviderRouteProbing] = useState(false)
  const [isProviderRoutePreparing, setIsProviderRoutePreparing] = useState(false)
  const [recentAttachmentReferences, setRecentAttachmentReferences] = useState<AgentAttachmentReference[]>([])
  const [providerGatewayError, setProviderGatewayError] = useState<string | null>(null)
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
  const workspaceWidgetsRef = useRef<WorkspaceWidgetSnapshot[]>([])

  const activeProviderID = useMemo(
    () => (selectedProviderID || providerCatalog?.active_provider_id || '').trim(),
    [providerCatalog?.active_provider_id, selectedProviderID],
  )

  const refreshProviderGatewaySnapshot = useCallback(async (options?: { suppressError?: boolean }) => {
    return refreshProviderGatewaySnapshotForPanel({
      setIsProviderGatewayPending,
      setProviderGateway,
      setProviderGatewayError,
      suppressError: options?.suppressError,
    })
  }, [])

  const refreshActiveProviderHistory = useCallback(
    async (options?: { providerID?: string; suppressError?: boolean }) => {
      return refreshActiveProviderHistoryForPanel({
        activeProviderID,
        providerID: options?.providerID,
        setActiveProviderHistoryError,
        setActiveProviderHistoryRuns,
        setActiveProviderHistoryTotal,
        setIsActiveProviderHistoryPending,
        suppressError: options?.suppressError,
      })
    },
    [activeProviderID],
  )

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
      resetAgentPanelRuntime({
        clearActiveAuditMessageID: () => {
          activeAuditMessageIDRef.current = null
        },
        clearPendingFlowRef: () => {
          pendingFlowRef.current = null
        },
        closeActiveStream: () => {
          activeStreamRef.current?.close()
          activeStreamRef.current = null
          activeSubmissionAbortRef.current = null
        },
        resetContextRuntime: () => {
          hasLoadedContextWidgetsRef.current = false
          hasCustomizedContextWidgetSelectionRef.current = false
          workspaceWidgetsRef.current = []
        },
        setIsResponseCancellable,
        unblockAiWidget: () => unblockAiWidget(hostId),
      })
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
    resetAgentPanelRuntime({
      clearActiveAuditMessageID: () => {
        activeAuditMessageIDRef.current = null
      },
      clearPendingFlowRef: () => {
        pendingFlowRef.current = null
      },
      closeActiveStream: () => {
        activeStreamRef.current?.close()
        activeStreamRef.current = null
        activeSubmissionAbortRef.current = null
      },
      resetContextRuntime: () => {
        hasLoadedContextWidgetsRef.current = false
        hasCustomizedContextWidgetSelectionRef.current = false
        workspaceWidgetsRef.current = []
      },
      setIsResponseCancellable,
      unblockAiWidget: () => unblockAiWidget(hostId),
    })
    resetAgentPanelBootstrapState({
      defaultConversationListCounts,
      setActiveConversationID,
      setActiveConversationSummary: () => setActiveConversationSummary(null),
      setActiveProviderHistoryError,
      setActiveProviderHistoryRuns: () => setActiveProviderHistoryRuns([]),
      setActiveProviderHistoryTotal,
      setAgentCatalog,
      setAvailableModels,
      setContextWidgetLoadError,
      setContextWidgetOptions: () => setContextWidgetOptions([]),
      setConversationCounts,
      setConversationScope,
      setConversations: () => setConversations([]),
      setDraft,
      setInteractionMessages: () => setInteractionMessages([]),
      setIsActiveProviderHistoryPending,
      setIsAttachmentLibraryPending,
      setIsConversationListPending,
      setIsConversationPending,
      setIsProviderGatewayPending,
      setIsProviderRoutePreparing,
      setIsProviderRouteProbing,
      setIsSubmitting,
      setIsWidgetContextEnabled,
      setLoadError,
      setMessages,
      setMissingContextWidgetCount,
      setPendingFlow,
      setProvider,
      setProviderCatalog,
      setProviderGateway,
      setProviderGatewayError,
      setRecentAttachmentReferences,
      setSelectedModel,
      setSelectedProviderID,
      setStoredContextWidgetIDs,
      setSubmitError,
      setWorkspaceActiveWidgetID,
    })
    setConversationSearchQuery('')
    activeConversationIDRef.current = ''
    messagesRef.current = null
    void bootstrapAgentPanel({
      applyConversationSnapshot,
      getPanelStateEpoch: () => panelStateEpochRef.current,
      hostId,
      panelStateEpoch,
      setAgentCatalog,
      setAvailableModels,
      setLoadError,
      setProviderCatalog,
      setProviderGateway,
      setProviderGatewayError,
      setRecentAttachmentReferences,
      setSelectedModel,
      setSelectedProviderID,
      setSkipped: () => {
        cancelled = true
      },
    }).finally(() => {
      if (!cancelled && panelStateEpochRef.current === panelStateEpoch) {
        setIsProviderGatewayPending(false)
      }
    })

    return () => {
      cancelled = true
      submissionNonceRef.current += 1
      activeSubmissionAbortRef.current?.abort()
      resetAgentPanelRuntime({
        clearActiveAuditMessageID: () => {
          activeAuditMessageIDRef.current = null
        },
        clearPendingFlowRef: () => {
          pendingFlowRef.current = null
        },
        closeActiveStream: () => {
          activeStreamRef.current?.close()
          activeStreamRef.current = null
          activeSubmissionAbortRef.current = null
        },
        resetContextRuntime: () => {
          hasLoadedContextWidgetsRef.current = false
          hasCustomizedContextWidgetSelectionRef.current = false
          workspaceWidgetsRef.current = []
        },
        setIsResponseCancellable,
        unblockAiWidget: () => unblockAiWidget(hostId),
      })
    }
  }, [applyConversationSnapshot, beginPanelStateEpoch, enabled, hostId])

  useEffect(() => {
    if (!enabled) {
      return
    }

    void refreshActiveProviderHistory({ suppressError: true })
  }, [enabled, providerGateway?.generated_at, refreshActiveProviderHistory])

  const refreshConversationList = useCallback(
    async (
      overrides: {
        query?: string
        scope?: AgentConversationListScope
      } = {},
    ) => {
      return refreshConversationListForPanel({
        query: overrides.query ?? conversationSearchQuery,
        scope: overrides.scope ?? conversationScope,
        nextRequestNonce: () => {
          const requestNonce = conversationListRequestNonceRef.current + 1
          conversationListRequestNonceRef.current = requestNonce
          return requestNonce
        },
        getRequestNonce: () => conversationListRequestNonceRef.current,
        setActiveConversationID,
        setConversationCounts,
        setConversations,
        setIsConversationListPending,
      })
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

  const refreshAttachmentLibrary = useCallback(async () => {
    setIsAttachmentLibraryPending(true)
    try {
      const attachments = await fetchAgentAttachmentReferences()
      setRecentAttachmentReferences(attachments)
      return attachments
    } finally {
      setIsAttachmentLibraryPending(false)
    }
  }, [])

  const reuseStoredAttachmentReference = useCallback(
    (attachment: AgentAttachmentReference) => {
      onQueueAiAttachmentReference(attachment)
    },
    [onQueueAiAttachmentReference],
  )

  const deleteStoredAttachmentReference = useCallback(async (attachmentID: string) => {
    await deleteAgentAttachmentReference(attachmentID)
    setRecentAttachmentReferences((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentID),
    )
  }, [])

  const resetConversationInteractionState = useCallback(() => {
    pendingFlowRef.current = null
    setPendingFlow(null)
    setInteractionMessages([])
    setSubmitError(null)
  }, [])

  const resetConversationSubmissionState = useCallback(() => {
    resetConversationSubmissionRuntime({
      abortActiveSubmission: () => activeSubmissionAbortRef.current?.abort(),
      bumpSubmissionNonce: () => {
        submissionNonceRef.current += 1
      },
      clearActiveAuditMessageID: () => {
        activeAuditMessageIDRef.current = null
      },
      closeActiveStream: () => {
        activeStreamRef.current?.close()
        activeStreamRef.current = null
        activeSubmissionAbortRef.current = null
      },
    })
  }, [])

  const availableProviders = useMemo(() => providerOptionsFromCatalog(providerCatalog), [providerCatalog])
  const availableProfiles = useMemo(
    () => (agentCatalog ? agentSelectionOptionsFromItems(agentCatalog.profiles) : []),
    [agentCatalog],
  )
  const availableRoles = useMemo(
    () => (agentCatalog ? agentSelectionOptionsFromItems(agentCatalog.roles) : []),
    [agentCatalog],
  )
  const availableModes = useMemo(
    () => (agentCatalog ? agentSelectionOptionsFromItems(agentCatalog.modes) : []),
    [agentCatalog],
  )

  const selectProfile = useCallback(
    async (profileID: string) => {
      const nextProfileID = profileID.trim()
      if (!nextProfileID || nextProfileID === agentCatalog?.active.profile.id) {
        return
      }

      try {
        setSubmitError(null)
        setAgentCatalog(await setAgentProfile(nextProfileID))
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to switch the active AI prompt profile.'))
      }
    },
    [agentCatalog?.active.profile.id],
  )

  const selectRole = useCallback(
    async (roleID: string) => {
      const nextRoleID = roleID.trim()
      if (!nextRoleID || nextRoleID === agentCatalog?.active.role.id) {
        return
      }

      try {
        setSubmitError(null)
        setAgentCatalog(await setAgentRole(nextRoleID))
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to switch the active AI role.'))
      }
    },
    [agentCatalog?.active.role.id],
  )

  const selectMode = useCallback(
    async (modeID: string) => {
      const nextModeID = modeID.trim()
      if (!nextModeID || nextModeID === agentCatalog?.active.mode.id) {
        return
      }

      try {
        setSubmitError(null)
        setAgentCatalog(await setAgentMode(nextModeID))
      } catch (error) {
        setSubmitError(getErrorMessage(error, 'Unable to switch the active AI mode.'))
      }
    },
    [agentCatalog?.active.mode.id],
  )

  const selectProvider = useCallback(
    async (providerID: string) => {
      await selectProviderForPanel({
        beginPanelStateEpoch,
        getPanelStateEpoch: () => panelStateEpochRef.current,
        provider,
        providerID,
        refreshProviderGatewaySnapshot,
        selectedProviderID,
        setAvailableModels,
        setLoadError,
        setProvider,
        setProviderCatalog,
        setSelectedModel,
        setSelectedProviderID,
        setSubmitError,
      })
    },
    [beginPanelStateEpoch, provider, refreshProviderGatewaySnapshot, selectedProviderID],
  )

  const activeProviderGateway = useMemo<AgentProviderGatewayProvider | null>(() => {
    return resolveActiveProviderGateway(providerGateway, activeProviderID)
  }, [activeProviderID, providerGateway])

  const prewarmActiveProviderRoute = useCallback(async () => {
    await prewarmActiveProviderRouteForPanel({
      activeProviderID,
      isProviderRoutePreparing,
      isProviderRouteProbing,
      refreshProviderGatewaySnapshot,
      setIsProviderRoutePreparing,
      setIsProviderRouteProbing,
      setProviderGatewayError,
    })
  }, [activeProviderID, isProviderRoutePreparing, refreshProviderGatewaySnapshot])

  const probeActiveProviderRoute = useCallback(async () => {
    await probeActiveProviderRouteForPanel({
      activeProviderID,
      isProviderRoutePreparing,
      isProviderRouteProbing,
      refreshProviderGatewaySnapshot,
      setIsProviderRoutePreparing,
      setIsProviderRouteProbing,
      setProviderGatewayError,
    })
  }, [activeProviderID, isProviderRouteProbing, refreshProviderGatewaySnapshot])

  const clearActiveProviderRouteState = useCallback(async () => {
    await clearActiveProviderRouteStateForPanel({
      activeProviderID,
      isProviderGatewayPending,
      isProviderRoutePreparing,
      isProviderRouteProbing,
      refreshProviderGatewaySnapshot,
      setIsProviderRoutePreparing,
      setIsProviderRouteProbing,
      setProviderGatewayError,
    })
  }, [
    activeProviderID,
    isProviderGatewayPending,
    isProviderRoutePreparing,
    isProviderRouteProbing,
    refreshProviderGatewaySnapshot,
  ])

  const switchConversation = useCallback(
    async (conversationID: string) => {
      await switchConversationForPanel({
        activeConversationID,
        applyConversationSnapshot,
        beginPanelStateEpoch,
        conversationID,
        getPanelStateEpoch: () => panelStateEpochRef.current,
        isConversationPending,
        isSubmitting,
        resetConversationInteractionState,
        resetConversationSubmissionRuntime: resetConversationSubmissionState,
        refreshConversationList: () => refreshConversationList(),
        setIsConversationPending,
        setSubmitError,
      })
    },
    [
      activeConversationID,
      applyConversationSnapshot,
      beginPanelStateEpoch,
      isConversationPending,
      isSubmitting,
      refreshConversationList,
      resetConversationSubmissionState,
      resetConversationInteractionState,
    ],
  )

  const createConversation = useCallback(async () => {
    await createConversationForPanel({
      applyConversationSnapshot,
      beginPanelStateEpoch,
      getPanelStateEpoch: () => panelStateEpochRef.current,
      isConversationPending,
      isSubmitting,
      resetConversationInteractionState,
      resetConversationSubmissionRuntime: resetConversationSubmissionState,
      refreshConversationList: () => refreshConversationList(),
      setIsConversationPending,
      setSubmitError,
    })
  }, [
    applyConversationSnapshot,
    beginPanelStateEpoch,
    isConversationPending,
    isSubmitting,
    refreshConversationList,
    resetConversationSubmissionState,
    resetConversationInteractionState,
  ])

  const renameConversation = useCallback(
    async (conversationID: string, title: string) => {
      await renameConversationForPanel({
        applyConversationSnapshot,
        conversationID,
        isConversationPending,
        isSubmitting,
        refreshConversationList: () => refreshConversationList(),
        setIsConversationPending,
        setSubmitError,
        title,
      })
    },
    [applyConversationSnapshot, isConversationPending, isSubmitting, refreshConversationList],
  )

  const deleteConversation = useCallback(
    async (conversationID: string) => {
      await deleteConversationForPanel({
        activeConversationID,
        applyConversationSnapshot,
        beginPanelStateEpoch,
        conversationID,
        getPanelStateEpoch: () => panelStateEpochRef.current,
        isConversationPending,
        isSubmitting,
        query: conversationSearchQuery,
        resetConversationInteractionState,
        resetConversationSubmissionRuntime: resetConversationSubmissionState,
        scope: conversationScope,
        setActiveConversationID,
        setConversationCounts,
        setConversations,
        setIsConversationPending,
        setSubmitError,
      })
    },
    [
      applyConversationSnapshot,
      activeConversationID,
      beginPanelStateEpoch,
      conversationScope,
      conversationSearchQuery,
      isConversationPending,
      isSubmitting,
      resetConversationSubmissionState,
      resetConversationInteractionState,
    ],
  )

  const archiveConversation = useCallback(
    async (conversationID: string) => {
      await archiveConversationForPanel({
        activeConversationID,
        applyConversationSnapshot,
        beginPanelStateEpoch,
        conversationID,
        getPanelStateEpoch: () => panelStateEpochRef.current,
        isConversationPending,
        isSubmitting,
        query: conversationSearchQuery,
        resetConversationInteractionState,
        resetConversationSubmissionRuntime: resetConversationSubmissionState,
        scope: conversationScope,
        setActiveConversationID,
        setConversationCounts,
        setConversations,
        setIsConversationPending,
        setSubmitError,
      })
    },
    [
      applyConversationSnapshot,
      activeConversationID,
      beginPanelStateEpoch,
      conversationScope,
      conversationSearchQuery,
      isConversationPending,
      isSubmitting,
      resetConversationSubmissionState,
      resetConversationInteractionState,
    ],
  )

  const restoreConversation = useCallback(
    async (conversationID: string) => {
      await restoreConversationForPanel({
        activeConversationID,
        applyConversationSnapshot,
        beginPanelStateEpoch,
        conversationID,
        getPanelStateEpoch: () => panelStateEpochRef.current,
        isConversationPending,
        isSubmitting,
        query: conversationSearchQuery,
        resetConversationInteractionState,
        resetConversationSubmissionRuntime: resetConversationSubmissionState,
        scope: conversationScope,
        setActiveConversationID,
        setConversationCounts,
        setConversations,
        setIsConversationPending,
        setSubmitError,
      })
    },
    [
      applyConversationSnapshot,
      activeConversationID,
      beginPanelStateEpoch,
      conversationScope,
      conversationSearchQuery,
      isConversationPending,
      isSubmitting,
      resetConversationSubmissionState,
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
    await ensureCurrentConversationSnapshotLoadedForPanel({
      activeConversationID: activeConversationIDRef.current,
      applyConversationSnapshot,
      hasMessagesLoaded: messagesRef.current != null,
      refreshConversationList: () => refreshConversationList(),
    })
  }, [applyConversationSnapshot, refreshConversationList])

  const persistConversationContextPreferences = useCallback(
    async (preferences: AgentConversationContextPreferences) => {
      await persistConversationContextPreferencesForPanel({
        activeConversationID: activeConversationIDRef.current,
        applyConversationSnapshot,
        preferences,
        refreshConversationList: () => refreshConversationList(),
      })
    },
    [applyConversationSnapshot, refreshConversationList],
  )

  const persistCleanedContextWidgetSelection = useCallback(
    async (options: AiContextWidgetOption[]) => {
      const persisted = await persistCleanedContextWidgetSelectionForPanel({
        hasCustomizedContextWidgetSelection: hasCustomizedContextWidgetSelectionRef.current,
        isWidgetContextEnabled: isWidgetContextEnabledRef.current,
        options,
        persistConversationContextPreferences,
        setMissingContextWidgetCount,
        setStoredContextWidgetIDs: (widgetIDs) => {
          storedContextWidgetIDsRef.current = widgetIDs
          setStoredContextWidgetIDs(widgetIDs)
        },
        storedContextWidgetIDs: storedContextWidgetIDsRef.current,
      })
      return persisted
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

  const loadContextWidgets = useCallback(async (): Promise<{
    activeWidgetID: string
    options: AiContextWidgetOption[]
    widgets: WorkspaceWidgetSnapshot[]
  }> => {
    const snapshot = await loadContextWidgetsForPanel({
      contextWidgetOptions: contextWidgetOptionsRef.current,
      enabled,
      hasCustomizedContextWidgetSelection: hasCustomizedContextWidgetSelectionRef.current,
      hasLoadedContextWidgets: hasLoadedContextWidgetsRef.current,
      setContextWidgetLoadError,
      setContextWidgetOptions: (options) => {
        contextWidgetOptionsRef.current = options
        setContextWidgetOptions(options)
      },
      setMissingContextWidgetCount,
      setWorkspaceActiveWidgetID: (widgetID) => {
        workspaceActiveWidgetIDRef.current = widgetID
        setWorkspaceActiveWidgetID(widgetID)
      },
      storedContextWidgetIDs: storedContextWidgetIDsRef.current,
      workspaceActiveWidgetID: workspaceActiveWidgetIDRef.current,
      workspaceWidgets: workspaceWidgetsRef.current,
    })

    hasLoadedContextWidgetsRef.current = true
    workspaceWidgetsRef.current = snapshot.widgets
    return snapshot
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

  const createToolExecutionContext = useCallback(
    (input: {
      actionSource: string
      activeWidgetID?: string
      repoRoot: string
      targetConnectionID?: string
      targetSession?: string
      includeActiveWidgetInSelection?: boolean
    }) => {
      const conversationContext = createConversationContext(input)

      return {
        action_source: conversationContext.action_source,
        active_widget_id: conversationContext.active_widget_id,
        repo_root: conversationContext.repo_root,
        target_connection_id: conversationContext.target_connection_id,
        target_session: conversationContext.target_session,
      }
    },
    [createConversationContext],
  )

  const hasTerminalExecutionContext =
    Object.keys(terminalPanelBindings).length > 0 || storedContextWidgetIDs.length > 0

  const resolveTerminalExecutionTarget = useCallback(async (): Promise<TerminalExecutionTarget> => {
    return resolveTerminalExecutionTargetForPanel({
      activeWidgetHostId,
      contextWidgetOptions: contextWidgetOptionsRef.current,
      ensureVisibleTerminalTarget: options.ensureVisibleTerminalTarget,
      hasLoadedContextWidgets: hasLoadedContextWidgetsRef.current,
      isWidgetContextEnabled,
      loadContextWidgets,
      resolveCurrentContextWidgetID,
      storedContextWidgetIDs: storedContextWidgetIDsRef.current,
      terminalPanelBindings,
      workspaceActiveWidgetID: workspaceActiveWidgetIDRef.current,
      workspaceWidgets: workspaceWidgetsRef.current,
    })
  }, [
    activeWidgetHostId,
    isWidgetContextEnabled,
    loadContextWidgets,
    options,
    resolveCurrentContextWidgetID,
    terminalPanelBindings,
  ])

  const runTerminalPrompt = useCallback(
    async (prompt: string, repoRoot: string) => {
      return runTerminalPromptForPanel({
        activeSubmissionSignal: activeSubmissionAbortRef.current?.signal,
        applyConversationSnapshot,
        createConversationContext,
        hostId,
        nextFlowSequence: () => {
          const flowSequence = flowCounterRef.current
          flowCounterRef.current += 1
          return flowSequence
        },
        nextLocalSortKey,
        prompt,
        refreshConversationList: () => refreshConversationList(),
        repoRoot,
        resolveTerminalExecutionTarget,
        setInteractionMessages,
        setPendingFlow,
        setPendingFlowRef: (flow) => {
          pendingFlowRef.current = flow
        },
        setSubmitError,
      })
    },
    [
      applyConversationSnapshot,
      createConversationContext,
      hostId,
      nextLocalSortKey,
      refreshConversationList,
      resolveTerminalExecutionTarget,
    ],
  )

  const runApprovedTerminalPrompt = useCallback(
    async (runApproval: PendingRunApproval, approvalToken: string) => {
      await runApprovedTerminalPromptForPanel(
        {
          activeSubmissionSignal: activeSubmissionAbortRef.current?.signal,
          applyConversationSnapshot,
          createConversationContext,
          refreshConversationList: () => refreshConversationList(),
          runApproval,
          setSubmitError,
        },
        approvalToken,
      )
    },
    [applyConversationSnapshot, createConversationContext, refreshConversationList],
  )

  const runApprovedExecutionPlan = useCallback(
    async (prompt: string, repoRoot: string, model?: string) => {
      await runApprovedExecutionPlanForPanel({
        activeSubmissionSignal: activeSubmissionAbortRef.current?.signal,
        applyConversationSnapshot,
        createConversationContext,
        createToolExecutionContext,
        model,
        prompt,
        refreshConversationList: () => refreshConversationList(),
        repoRoot,
        resolveTerminalExecutionTarget,
        setSubmitError,
      })
    },
    [
      applyConversationSnapshot,
      createConversationContext,
      createToolExecutionContext,
      refreshConversationList,
      resolveTerminalExecutionTarget,
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
      await runBackendPromptForPanel({
        applyConversationSnapshot,
        blockAiWidget: () => blockAiWidget(hostId),
        createConversationContext: ({ actionSource, repoRoot }) =>
          createConversationContext({
            actionSource,
            repoRoot,
          }),
        getActiveAuditMessageID: () => activeAuditMessageIDRef.current,
        getHostId: () => hostId,
        getSubmissionNonce: () => submissionNonceRef.current,
        model: options?.model,
        nextSubmissionNonce: () => {
          submissionNonceRef.current += 1
          return submissionNonceRef.current
        },
        options,
        prompt,
        refreshConversationList: () => refreshConversationList(),
        refreshProviderGatewaySnapshot: () => {
          void refreshProviderGatewaySnapshot({ suppressError: true })
        },
        resolveRuntimeContext,
        runTerminalPrompt,
        setActiveAuditMessageID: (id) => {
          activeAuditMessageIDRef.current = id
        },
        setActiveStream: (connection) => {
          activeStreamRef.current = connection
        },
        setActiveSubmissionAbort: (controller) => {
          activeSubmissionAbortRef.current = controller
        },
        setIsResponseCancellable,
        setIsSubmitting,
        setLoadError,
        setMessages,
        setSubmitError,
        unblockAiWidget: () => unblockAiWidget(hostId),
        updateAuditMessageEntries,
      })
    },
    [
      applyConversationSnapshot,
      hostId,
      createConversationContext,
      refreshProviderGatewaySnapshot,
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
    const interactionFlow = createPendingInteractionFlow(
      hostId,
      prompt,
      flowSequence,
      nextLocalSortKey,
      undefined,
      {
        hasTerminalContext: hasTerminalExecutionContext,
      },
    )

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
    hasTerminalExecutionContext,
  ])

  const cancelActiveSubmission = useCallback(() => {
    cancelActiveSubmissionForPanel({
      activeAuditMessageID: activeAuditMessageIDRef.current,
      activeStream: activeStreamRef.current,
      hasActiveAbortController: activeSubmissionAbortRef.current != null,
      hostId,
      isSubmitting,
      nextSubmissionNonce: () => {
        submissionNonceRef.current += 1
        return submissionNonceRef.current
      },
      setActiveAuditMessageID: (id) => {
        activeAuditMessageIDRef.current = id
      },
      setActiveStream: (connection) => {
        activeStreamRef.current = connection
      },
      setActiveSubmissionAbort: (controller) => {
        activeSubmissionAbortRef.current = controller
      },
      setIsResponseCancellable,
      setIsSubmitting,
      setMessages,
      setSubmitError,
      unblockAiWidget: () => unblockAiWidget(hostId),
      updateAuditMessageEntries,
    })
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
      await answerQuestionnaireForPanel({
        answer,
        clearPendingInteractionFlow,
        getPendingFlow: () => pendingFlowRef.current,
        hasTerminalExecutionContext,
        message,
        nextLocalSortKey,
        runBackendPrompt,
        selectedModel,
        setInteractionMessages,
        setPendingFlow,
        setPendingFlowRef: (flow) => {
          pendingFlowRef.current = flow
        },
      })
    },
    [
      clearPendingInteractionFlow,
      hasTerminalExecutionContext,
      nextLocalSortKey,
      runBackendPrompt,
      selectedModel,
    ],
  )

  const approvePendingPlan = useCallback(
    async (message: ApprovalMessage) => {
      await approvePendingPlanForPanel({
        blockAiWidget: () => blockAiWidget(hostId),
        clearPendingInteractionFlow,
        getPendingFlow: () => pendingFlowRef.current,
        hostId,
        message,
        nextLocalSortKey,
        runApprovedExecutionPlan,
        runApprovedTerminalPrompt,
        runBackendPrompt,
        selectedModel,
        setInteractionMessages,
        setIsResponseCancellable,
        setIsSubmitting,
        setPendingFlow,
        setPendingFlowRef: (flow) => {
          pendingFlowRef.current = flow
        },
        setSubmitError,
        unblockAiWidget: () => unblockAiWidget(hostId),
        updateAuditMessageEntries,
      })
    },
    [
      clearPendingInteractionFlow,
      hostId,
      nextLocalSortKey,
      runApprovedExecutionPlan,
      runApprovedTerminalPrompt,
      runBackendPrompt,
      selectedModel,
      updateAuditMessageEntries,
    ],
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
    activeProviderGateway,
    activeProviderHistoryError,
    activeProviderHistoryRuns,
    activeProviderHistoryTotal,
    answerQuestionnaire,
    approvePendingPlan,
    availableModes,
    availableProviders,
    availableProfiles,
    availableRoles,
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
    recentAttachmentReferences,
    isAttachmentLibraryPending,
    isActiveProviderHistoryPending,
    isProviderGatewayPending,
    isProviderRouteProbing,
    isProviderRoutePreparing,
    clearActiveProviderRouteState,
    refreshAttachmentLibrary,
    refreshProviderGatewaySnapshot,
    reuseStoredAttachmentReference,
    deleteStoredAttachmentReference,
    removeQueuedAttachmentReference: onRemoveQueuedAttachmentReference,
    selectedContextWidgetIDs: effectiveContextWidgetIDs,
    selectedModel,
    selectedProviderID,
    selectedProfileID: agentCatalog?.active.profile.id ?? '',
    selectedRoleID: agentCatalog?.active.role.id ?? '',
    selectedModeID: agentCatalog?.active.mode.id ?? '',
    probeActiveProviderRoute,
    selectMode,
    selectProfile,
    selectProvider,
    prewarmActiveProviderRoute,
    providerGatewayError,
    selectRole,
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
