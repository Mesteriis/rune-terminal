import {
  activateAgentConversation,
  archiveAgentConversation,
  createAgentConversation,
  deleteAgentConversation,
  fetchAgentConversations,
  renameAgentConversation,
  restoreAgentConversation,
  type AgentConversationListCounts,
  type AgentConversationListScope,
  type AgentConversationSnapshot,
  type AgentConversationSummary,
} from '@/features/agent/api/client'
import { sortConversationSummaries } from '@/features/agent/model/agent-panel-context'
import { getErrorMessage } from '@/features/agent/model/agent-panel-terminal'

type AgentConversationList = Awaited<ReturnType<typeof fetchAgentConversations>>

type ConversationDeps = {
  activateAgentConversation: typeof activateAgentConversation
  archiveAgentConversation: typeof archiveAgentConversation
  createAgentConversation: typeof createAgentConversation
  deleteAgentConversation: typeof deleteAgentConversation
  fetchAgentConversations: typeof fetchAgentConversations
  getErrorMessage: typeof getErrorMessage
  renameAgentConversation: typeof renameAgentConversation
  restoreAgentConversation: typeof restoreAgentConversation
  sortConversationSummaries: typeof sortConversationSummaries
}

const defaultDeps: ConversationDeps = {
  activateAgentConversation,
  archiveAgentConversation,
  createAgentConversation,
  deleteAgentConversation,
  fetchAgentConversations,
  getErrorMessage,
  renameAgentConversation,
  restoreAgentConversation,
  sortConversationSummaries,
}

type ResetConversationSubmissionRuntimeInput = {
  abortActiveSubmission: () => void
  bumpSubmissionNonce: () => void
  clearActiveAuditMessageID: () => void
  closeActiveStream: () => void
}

export function resetConversationSubmissionRuntime(input: ResetConversationSubmissionRuntimeInput) {
  input.bumpSubmissionNonce()
  input.abortActiveSubmission()
  input.closeActiveStream()
  input.clearActiveAuditMessageID()
}

type RefreshConversationListInput = {
  query: string
  scope: AgentConversationListScope
  nextRequestNonce: () => number
  getRequestNonce: () => number
  setActiveConversationID: (updater: string | ((currentConversationID: string) => string)) => void
  setConversationCounts: (counts: AgentConversationListCounts) => void
  setConversations: (conversations: AgentConversationSummary[]) => void
  setIsConversationListPending: (pending: boolean) => void
}

export async function refreshConversationListForPanel(
  input: RefreshConversationListInput,
  deps: ConversationDeps = defaultDeps,
) {
  const requestNonce = input.nextRequestNonce()
  input.setIsConversationListPending(true)

  try {
    const conversationList = await deps.fetchAgentConversations({
      query: input.query,
      scope: input.scope,
    })

    if (input.getRequestNonce() !== requestNonce) {
      return null
    }

    input.setConversations(deps.sortConversationSummaries(conversationList.conversations))
    input.setConversationCounts(conversationList.counts)
    input.setActiveConversationID(
      (currentConversationID) => conversationList.active_conversation_id || currentConversationID || '',
    )
    return conversationList
  } finally {
    if (input.getRequestNonce() === requestNonce) {
      input.setIsConversationListPending(false)
    }
  }
}

type ConversationTransitionInput = {
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  beginPanelStateEpoch: () => number
  getPanelStateEpoch: () => number
  isConversationPending: boolean
  isSubmitting: boolean
  resetConversationInteractionState: () => void
  resetConversationSubmissionRuntime: () => void
  refreshConversationList: () => Promise<AgentConversationList | null>
  setIsConversationPending: (pending: boolean) => void
  setSubmitError: (error: string | null) => void
}

type SwitchConversationInput = ConversationTransitionInput & {
  activeConversationID: string
  conversationID: string
}

export async function switchConversationForPanel(
  input: SwitchConversationInput,
  deps: ConversationDeps = defaultDeps,
) {
  const nextConversationID = input.conversationID.trim()
  if (
    !nextConversationID ||
    nextConversationID === input.activeConversationID ||
    input.isSubmitting ||
    input.isConversationPending
  ) {
    return
  }

  input.resetConversationSubmissionRuntime()
  const panelStateEpoch = input.beginPanelStateEpoch()
  input.setIsConversationPending(true)

  try {
    const snapshot = await deps.activateAgentConversation(nextConversationID)
    if (input.getPanelStateEpoch() !== panelStateEpoch) {
      return
    }
    input.applyConversationSnapshot(snapshot)
    input.resetConversationInteractionState()
    await input.refreshConversationList()
  } catch (error) {
    input.setSubmitError(deps.getErrorMessage(error, 'Unable to switch the active conversation.'))
  } finally {
    input.setIsConversationPending(false)
  }
}

export async function createConversationForPanel(
  input: ConversationTransitionInput,
  deps: ConversationDeps = defaultDeps,
) {
  if (input.isSubmitting || input.isConversationPending) {
    return
  }

  input.resetConversationSubmissionRuntime()
  const panelStateEpoch = input.beginPanelStateEpoch()
  input.setIsConversationPending(true)

  try {
    const snapshot = await deps.createAgentConversation()
    if (input.getPanelStateEpoch() !== panelStateEpoch) {
      return
    }
    input.applyConversationSnapshot(snapshot)
    input.resetConversationInteractionState()
    await input.refreshConversationList()
  } catch (error) {
    input.setSubmitError(deps.getErrorMessage(error, 'Unable to create a new conversation.'))
  } finally {
    input.setIsConversationPending(false)
  }
}

type RenameConversationInput = {
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  conversationID: string
  isConversationPending: boolean
  isSubmitting: boolean
  refreshConversationList: () => Promise<unknown>
  setIsConversationPending: (pending: boolean) => void
  setSubmitError: (error: string | null) => void
  title: string
}

export async function renameConversationForPanel(
  input: RenameConversationInput,
  deps: ConversationDeps = defaultDeps,
) {
  const nextConversationID = input.conversationID.trim()
  if (!nextConversationID || input.isSubmitting || input.isConversationPending) {
    return
  }

  input.setIsConversationPending(true)
  try {
    const snapshot = await deps.renameAgentConversation(nextConversationID, input.title)
    input.applyConversationSnapshot(snapshot)
    void input.refreshConversationList().catch((error) => {
      input.setSubmitError(deps.getErrorMessage(error, 'Unable to refresh the conversation list.'))
    })
  } catch (error) {
    input.setSubmitError(deps.getErrorMessage(error, 'Unable to rename the conversation.'))
  } finally {
    input.setIsConversationPending(false)
  }
}

type MutateConversationCollectionInput = {
  activeConversationID: string
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  beginPanelStateEpoch: () => number
  conversationID: string
  query: string
  scope: AgentConversationListScope
  getPanelStateEpoch: () => number
  isConversationPending: boolean
  isSubmitting: boolean
  resetConversationInteractionState: () => void
  resetConversationSubmissionRuntime: () => void
  setActiveConversationID: (conversationID: string) => void
  setConversationCounts: (counts: AgentConversationListCounts) => void
  setConversations: (conversations: AgentConversationSummary[]) => void
  setIsConversationPending: (pending: boolean) => void
  setSubmitError: (error: string | null) => void
}

async function mutateConversationCollectionForPanel(
  input: MutateConversationCollectionInput,
  mutateConversation: (conversationID: string) => Promise<AgentConversationSnapshot>,
  errorMessage: string,
  deps: ConversationDeps,
) {
  const nextConversationID = input.conversationID.trim()
  if (!nextConversationID || input.isSubmitting || input.isConversationPending) {
    return
  }

  input.resetConversationSubmissionRuntime()
  const panelStateEpoch = input.beginPanelStateEpoch()
  input.setIsConversationPending(true)

  try {
    const snapshot = await mutateConversation(nextConversationID)
    const conversationList = await deps.fetchAgentConversations({
      query: input.query,
      scope: input.scope,
    })
    if (input.getPanelStateEpoch() !== panelStateEpoch) {
      return
    }
    if (input.activeConversationID === nextConversationID) {
      input.applyConversationSnapshot(snapshot)
      input.resetConversationInteractionState()
    }
    input.setConversations(deps.sortConversationSummaries(conversationList.conversations))
    input.setConversationCounts(conversationList.counts)
    input.setActiveConversationID(conversationList.active_conversation_id || snapshot.id)
  } catch (error) {
    input.setSubmitError(deps.getErrorMessage(error, errorMessage))
  } finally {
    input.setIsConversationPending(false)
  }
}

export async function deleteConversationForPanel(
  input: MutateConversationCollectionInput,
  deps: ConversationDeps = defaultDeps,
) {
  return mutateConversationCollectionForPanel(
    input,
    deps.deleteAgentConversation,
    'Unable to delete the conversation.',
    deps,
  )
}

export async function archiveConversationForPanel(
  input: MutateConversationCollectionInput,
  deps: ConversationDeps = defaultDeps,
) {
  return mutateConversationCollectionForPanel(
    input,
    deps.archiveAgentConversation,
    'Unable to archive the conversation.',
    deps,
  )
}

export async function restoreConversationForPanel(
  input: MutateConversationCollectionInput,
  deps: ConversationDeps = defaultDeps,
) {
  return mutateConversationCollectionForPanel(
    input,
    deps.restoreAgentConversation,
    'Unable to restore the conversation.',
    deps,
  )
}
