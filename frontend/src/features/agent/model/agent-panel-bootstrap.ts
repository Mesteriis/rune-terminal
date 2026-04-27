import {
  fetchAgentAttachmentReferences,
  fetchAgentCatalog,
  fetchAgentConversation,
  type AgentAttachmentReference,
  type AgentCatalog,
  type AgentConversationListCounts,
  type AgentConversationMessage,
  type AgentConversationProvider,
  type AgentConversationSnapshot,
} from '@/features/agent/api/client'
import {
  fetchAgentProviderCatalog,
  fetchAgentProviderGatewaySnapshot,
  type AgentProviderCatalog,
  type AgentProviderGatewaySnapshot,
  type AgentProviderView,
} from '@/features/agent/api/provider-client'
import {
  directProviderChatModels,
  directProviderDefaultModel,
  selectPreferredChatModel,
} from '@/features/agent/model/agent-panel-provider'
import { getErrorMessage } from '@/features/agent/model/agent-panel-terminal'
import type { ChatMessageView } from '@/features/agent/model/types'
import type { PendingInteractionFlow } from '@/features/agent/model/interaction-flow'

type BootstrapDeps = {
  directProviderChatModels: typeof directProviderChatModels
  directProviderDefaultModel: typeof directProviderDefaultModel
  fetchAgentAttachmentReferences: typeof fetchAgentAttachmentReferences
  fetchAgentCatalog: typeof fetchAgentCatalog
  fetchAgentConversation: typeof fetchAgentConversation
  fetchAgentProviderCatalog: typeof fetchAgentProviderCatalog
  fetchAgentProviderGatewaySnapshot: typeof fetchAgentProviderGatewaySnapshot
  getErrorMessage: typeof getErrorMessage
  selectPreferredChatModel: typeof selectPreferredChatModel
}

const defaultDeps: BootstrapDeps = {
  directProviderChatModels,
  directProviderDefaultModel,
  fetchAgentAttachmentReferences,
  fetchAgentCatalog,
  fetchAgentConversation,
  fetchAgentProviderCatalog,
  fetchAgentProviderGatewaySnapshot,
  getErrorMessage,
  selectPreferredChatModel,
}

type ResetAgentPanelRuntimeInput = {
  clearActiveAuditMessageID: () => void
  clearPendingFlowRef: () => void
  closeActiveStream: () => void
  resetContextRuntime: () => void
  setIsResponseCancellable: (value: boolean) => void
  unblockAiWidget: () => void
}

export function resetAgentPanelRuntime(input: ResetAgentPanelRuntimeInput) {
  input.closeActiveStream()
  input.clearActiveAuditMessageID()
  input.clearPendingFlowRef()
  input.resetContextRuntime()
  input.setIsResponseCancellable(false)
  input.unblockAiWidget()
}

type ResetAgentPanelBootstrapStateInput = {
  defaultConversationListCounts: AgentConversationListCounts
  setActiveConversationID: (value: string) => void
  setActiveConversationSummary: (value: null) => void
  setActiveProviderHistoryError: (value: string | null) => void
  setActiveProviderHistoryRuns: (value: []) => void
  setActiveProviderHistoryTotal: (value: number) => void
  setAgentCatalog: (value: AgentCatalog | null) => void
  setAvailableModels: (value: string[]) => void
  setContextWidgetLoadError: (value: string | null) => void
  setContextWidgetOptions: (value: []) => void
  setConversationCounts: (value: AgentConversationListCounts) => void
  setConversationScope: (value: 'recent') => void
  setConversations: (value: []) => void
  setDraft: (value: string) => void
  setInteractionMessages: (value: ChatMessageView[]) => void
  setIsActiveProviderHistoryPending: (value: boolean) => void
  setIsAttachmentLibraryPending: (value: boolean) => void
  setIsConversationListPending: (value: boolean) => void
  setIsConversationPending: (value: boolean) => void
  setIsProviderGatewayPending: (value: boolean) => void
  setIsProviderRoutePreparing: (value: boolean) => void
  setIsProviderRouteProbing: (value: boolean) => void
  setIsSubmitting: (value: boolean) => void
  setIsWidgetContextEnabled: (value: boolean) => void
  setLoadError: (value: string | null) => void
  setMessages: (value: AgentConversationMessage[] | null) => void
  setMissingContextWidgetCount: (value: number) => void
  setPendingFlow: (value: PendingInteractionFlow | null) => void
  setProvider: (value: AgentConversationProvider | null) => void
  setProviderCatalog: (value: AgentProviderCatalog | null) => void
  setProviderGateway: (value: AgentProviderGatewaySnapshot | null) => void
  setProviderGatewayError: (value: string | null) => void
  setRecentAttachmentReferences: (value: AgentAttachmentReference[]) => void
  setSelectedModel: (value: string) => void
  setSelectedProviderID: (value: string) => void
  setStoredContextWidgetIDs: (value: string[]) => void
  setSubmitError: (value: string | null) => void
  setWorkspaceActiveWidgetID: (value: string) => void
}

export function resetAgentPanelBootstrapState(input: ResetAgentPanelBootstrapStateInput) {
  input.setMessages(null)
  input.setInteractionMessages([])
  input.setPendingFlow(null)
  input.setProvider(null)
  input.setProviderCatalog(null)
  input.setProviderGateway(null)
  input.setActiveProviderHistoryRuns([])
  input.setActiveProviderHistoryTotal(0)
  input.setActiveProviderHistoryError(null)
  input.setAgentCatalog(null)
  input.setActiveConversationSummary(null)
  input.setConversations([])
  input.setConversationCounts(input.defaultConversationListCounts)
  input.setIsConversationListPending(true)
  input.setConversationScope('recent')
  input.setActiveConversationID('')
  input.setSelectedProviderID('')
  input.setAvailableModels([])
  input.setSelectedModel('')
  input.setIsWidgetContextEnabled(true)
  input.setContextWidgetOptions([])
  input.setStoredContextWidgetIDs([])
  input.setMissingContextWidgetCount(0)
  input.setWorkspaceActiveWidgetID('')
  input.setContextWidgetLoadError(null)
  input.setLoadError(null)
  input.setSubmitError(null)
  input.setIsSubmitting(false)
  input.setIsAttachmentLibraryPending(false)
  input.setIsProviderGatewayPending(true)
  input.setIsActiveProviderHistoryPending(false)
  input.setIsProviderRouteProbing(false)
  input.setIsProviderRoutePreparing(false)
  input.setRecentAttachmentReferences([])
  input.setProviderGatewayError(null)
  input.setIsConversationPending(false)
  input.setDraft('')
}

type BootstrapAgentPanelInput = {
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  getPanelStateEpoch: () => number
  hostId: string
  panelStateEpoch: number
  setAgentCatalog: (catalog: AgentCatalog) => void
  setAvailableModels: (models: string[]) => void
  setLoadError: (value: string | null) => void
  setProviderCatalog: (catalog: AgentProviderCatalog) => void
  setProviderGateway: (snapshot: AgentProviderGatewaySnapshot) => void
  setProviderGatewayError: (value: string | null) => void
  setRecentAttachmentReferences: (attachments: AgentAttachmentReference[]) => void
  setSelectedModel: (value: string | ((currentModel: string) => string)) => void
  setSelectedProviderID: (providerID: string) => void
  setSkipped?: () => void
}

export async function bootstrapAgentPanel(
  input: BootstrapAgentPanelInput,
  deps: BootstrapDeps = defaultDeps,
) {
  const results = await Promise.allSettled([
    deps.fetchAgentConversation(),
    deps.fetchAgentProviderCatalog(),
    deps.fetchAgentProviderGatewaySnapshot(),
    deps.fetchAgentCatalog(),
    deps.fetchAgentAttachmentReferences(),
  ])

  if (input.getPanelStateEpoch() !== input.panelStateEpoch) {
    input.setSkipped?.()
    return
  }

  const [
    conversationResult,
    providerCatalogResult,
    providerGatewayResult,
    agentCatalogResult,
    attachmentLibraryResult,
  ] = results

  if (conversationResult.status === 'rejected') {
    input.setLoadError(
      deps.getErrorMessage(
        conversationResult.reason,
        `Unable to load backend conversation for ${input.hostId}.`,
      ),
    )
  } else {
    input.applyConversationSnapshot(conversationResult.value)
  }

  if (providerCatalogResult.status === 'fulfilled') {
    input.setProviderCatalog(providerCatalogResult.value)
    const activeProvider = findActiveProviderView(providerCatalogResult.value)
    const chatModels = deps.directProviderChatModels(activeProvider)
    const providerModel =
      deps.directProviderDefaultModel(activeProvider) ||
      (conversationResult.status === 'fulfilled' ? conversationResult.value.provider.model : undefined)

    input.setSelectedProviderID(activeProvider?.id ?? '')
    input.setAvailableModels(chatModels)
    input.setSelectedModel((currentModel) =>
      deps.selectPreferredChatModel(currentModel, providerModel, chatModels),
    )
  }

  if (providerGatewayResult.status === 'fulfilled') {
    input.setProviderGateway(providerGatewayResult.value)
    input.setProviderGatewayError(null)
  } else {
    input.setProviderGatewayError(
      deps.getErrorMessage(providerGatewayResult.reason, 'Unable to load provider gateway telemetry.'),
    )
  }

  if (agentCatalogResult.status === 'fulfilled') {
    input.setAgentCatalog(agentCatalogResult.value)
  }

  if (attachmentLibraryResult.status === 'fulfilled') {
    input.setRecentAttachmentReferences(attachmentLibraryResult.value)
  }
}

export function findActiveProviderView(
  providerCatalog: AgentProviderCatalog | null,
): AgentProviderView | null {
  if (!providerCatalog) {
    return null
  }
  return (
    providerCatalog.providers.find((candidate) => candidate.id === providerCatalog.active_provider_id) ?? null
  )
}
