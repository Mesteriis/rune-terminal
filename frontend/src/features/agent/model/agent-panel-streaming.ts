import {
  fetchAgentConversation,
  streamAgentConversationMessage,
  type AgentAttachmentReference,
  type AgentConversationMessage,
  type AgentConversationSnapshot,
  type AgentConversationStreamConnection,
  type AgentConversationStreamEvent,
} from '@/features/agent/api/client'
import {
  advanceAuditEntries,
  completeAuditEntries,
  failAuditEntries,
} from '@/features/agent/model/interaction-flow'
import {
  appendAgentConversationMessage,
  applyAgentConversationStreamEvent,
  finalizeAgentConversationStreamingMessages,
} from '@/features/agent/model/panel-state'

type StreamingDeps = {
  advanceAuditEntries: typeof advanceAuditEntries
  appendAgentConversationMessage: typeof appendAgentConversationMessage
  applyAgentConversationStreamEvent: typeof applyAgentConversationStreamEvent
  completeAuditEntries: typeof completeAuditEntries
  failAuditEntries: typeof failAuditEntries
  fetchAgentConversation: typeof fetchAgentConversation
  finalizeAgentConversationStreamingMessages: typeof finalizeAgentConversationStreamingMessages
  streamAgentConversationMessage: typeof streamAgentConversationMessage
}

const defaultDeps: StreamingDeps = {
  advanceAuditEntries,
  appendAgentConversationMessage,
  applyAgentConversationStreamEvent,
  completeAuditEntries,
  failAuditEntries,
  fetchAgentConversation,
  finalizeAgentConversationStreamingMessages,
  streamAgentConversationMessage,
}

type RunBackendPromptInput = {
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  blockAiWidget: () => void
  createConversationContext: (input: { actionSource: string; repoRoot: string }) => {
    action_source: string
    active_widget_id: string
    repo_root: string
    target_connection_id?: string
    target_session?: string
    widget_context_enabled: boolean
    widget_ids?: string[]
  }
  getActiveAuditMessageID: () => string | null
  getHostId: () => string
  getSubmissionNonce: () => number
  model?: string
  nextSubmissionNonce: () => number
  options?: {
    attachments?: AgentAttachmentReference[]
    auditMessageID?: string
    cancellable?: boolean
  }
  prompt: string
  refreshConversationList: () => Promise<unknown>
  refreshProviderGatewaySnapshot: () => void
  resolveRuntimeContext: () => Promise<{
    repoRoot: string
  }>
  runTerminalPrompt: (prompt: string, repoRoot: string) => Promise<boolean>
  setActiveAuditMessageID: (id: string | null) => void
  setActiveStream: (connection: AgentConversationStreamConnection | null) => void
  setActiveSubmissionAbort: (controller: AbortController | null) => void
  setIsResponseCancellable: (value: boolean) => void
  setIsSubmitting: (value: boolean) => void
  setLoadError: (value: string | null) => void
  setMessages: (
    update: (currentMessages: AgentConversationMessage[] | null) => AgentConversationMessage[],
  ) => void
  setSubmitError: (value: string | null) => void
  unblockAiWidget: () => void
  updateAuditMessageEntries: (
    auditMessageID: string,
    update: (message: { type: string; entries: unknown[] }) => unknown,
  ) => void
}

export async function runBackendPromptForPanel(
  input: RunBackendPromptInput,
  deps: StreamingDeps = defaultDeps,
) {
  const submissionNonce = input.nextSubmissionNonce()
  const isActiveSubmission = () => input.getSubmissionNonce() === submissionNonce
  const isCancellable = input.options?.cancellable !== false

  input.setIsSubmitting(true)
  input.setIsResponseCancellable(isCancellable)
  input.setLoadError(null)
  input.setSubmitError(null)
  input.blockAiWidget()

  const submissionAbortController = new AbortController()
  let auditProgressed = false
  let streamErrored = false
  let connection: AgentConversationStreamConnection | null = null
  input.setActiveSubmissionAbort(submissionAbortController)
  input.setActiveAuditMessageID(input.options?.auditMessageID ?? null)

  try {
    const runtimeContext = await input.resolveRuntimeContext()

    if (await input.runTerminalPrompt(input.prompt, runtimeContext.repoRoot)) {
      return
    }

    connection = await deps.streamAgentConversationMessage(
      {
        prompt: input.prompt,
        attachments: input.options?.attachments,
        model: input.model,
        context: input.createConversationContext({
          actionSource: 'frontend.ai.sidebar',
          repoRoot: runtimeContext.repoRoot,
        }),
      },
      {
        onEvent: (event: AgentConversationStreamEvent) => {
          if (!isActiveSubmission()) {
            return
          }

          input.setMessages((currentMessages) =>
            deps.applyAgentConversationStreamEvent(currentMessages ?? [], event),
          )

          if (event.type === 'text-delta' && input.options?.auditMessageID && !auditProgressed) {
            input.updateAuditMessageEntries(input.options.auditMessageID, (currentMessage) =>
              currentMessage.type === 'audit'
                ? {
                    ...currentMessage,
                    entries: deps.advanceAuditEntries(currentMessage.entries),
                  }
                : currentMessage,
            )
            auditProgressed = true
          }

          if (event.type === 'message-complete') {
            if (input.options?.auditMessageID) {
              input.updateAuditMessageEntries(input.options.auditMessageID, (currentMessage) =>
                currentMessage.type === 'audit'
                  ? {
                      ...currentMessage,
                      entries: deps.completeAuditEntries(currentMessage.entries),
                    }
                  : currentMessage,
              )
            }
          } else if (event.type === 'error') {
            streamErrored = true

            if (input.options?.auditMessageID) {
              input.updateAuditMessageEntries(input.options.auditMessageID, (currentMessage) =>
                currentMessage.type === 'audit'
                  ? {
                      ...currentMessage,
                      entries: deps.failAuditEntries(currentMessage.entries),
                    }
                  : currentMessage,
              )
            }

            if (!event.message && event.error?.trim()) {
              input.setSubmitError(event.error.trim())
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
    input.setActiveStream(connection)
    await connection.done

    if (isActiveSubmission() && !streamErrored) {
      const [snapshot] = await Promise.all([deps.fetchAgentConversation(), input.refreshConversationList()])
      input.applyConversationSnapshot(snapshot)
    }
  } catch (error: unknown) {
    if (!isActiveSubmission()) {
      return
    }

    const errorMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : `Unable to send backend conversation message for ${input.getHostId()}.`

    input.setMessages((currentMessages) =>
      deps.finalizeAgentConversationStreamingMessages(currentMessages ?? [], errorMessage),
    )

    if (input.options?.auditMessageID) {
      input.updateAuditMessageEntries(input.options.auditMessageID, (currentMessage) =>
        currentMessage.type === 'audit'
          ? {
              ...currentMessage,
              entries: deps.failAuditEntries(currentMessage.entries),
            }
          : currentMessage,
      )
    }

    input.setSubmitError(errorMessage)
  } finally {
    if (isActiveSubmission()) {
      if (connection) {
        input.setActiveStream(null)
      }
      if (input.getActiveAuditMessageID() === (input.options?.auditMessageID ?? null)) {
        input.setActiveAuditMessageID(null)
      }
      input.setActiveSubmissionAbort(null)
      input.refreshProviderGatewaySnapshot()
      input.unblockAiWidget()
      input.setIsSubmitting(false)
      input.setIsResponseCancellable(false)
    }
  }
}

type CancelActiveSubmissionInput = {
  activeAuditMessageID: string | null
  activeStream: AgentConversationStreamConnection | null
  hasActiveAbortController: boolean
  hostId: string
  isSubmitting: boolean
  nextSubmissionNonce: () => number
  setActiveAuditMessageID: (id: string | null) => void
  setActiveStream: (connection: AgentConversationStreamConnection | null) => void
  setActiveSubmissionAbort: (controller: AbortController | null) => void
  setIsResponseCancellable: (value: boolean) => void
  setIsSubmitting: (value: boolean) => void
  setMessages: (
    update: (currentMessages: AgentConversationMessage[] | null) => AgentConversationMessage[],
  ) => void
  setSubmitError: (value: string | null) => void
  unblockAiWidget: () => void
  updateAuditMessageEntries: (
    auditMessageID: string,
    update: (message: { type: string; entries: unknown[] }) => unknown,
  ) => void
}

export function cancelActiveSubmissionForPanel(
  input: CancelActiveSubmissionInput,
  deps: StreamingDeps = defaultDeps,
) {
  if (!input.isSubmitting && !input.activeStream && !input.hasActiveAbortController) {
    return
  }

  const cancellationMessage = 'Response cancelled by operator.'
  const nextSubmissionNonce = input.nextSubmissionNonce()
  const auditMessageID = input.activeAuditMessageID

  input.setActiveSubmissionAbort(null)
  input.setActiveStream(null)
  input.setActiveAuditMessageID(null)
  void input.activeStream?.cancel()

  if (auditMessageID) {
    input.updateAuditMessageEntries(auditMessageID, (currentMessage) =>
      currentMessage.type === 'audit'
        ? {
            ...currentMessage,
            entries: deps.failAuditEntries(currentMessage.entries),
          }
        : currentMessage,
    )
  }

  input.setMessages((currentMessages) => {
    const messagesBeforeCancel = currentMessages ?? []
    const hadStreamingMessage = messagesBeforeCancel.some((message) => message.status === 'streaming')
    const finalizedMessages = deps.finalizeAgentConversationStreamingMessages(
      messagesBeforeCancel,
      cancellationMessage,
    )

    if (hadStreamingMessage) {
      return finalizedMessages
    }

    return deps.appendAgentConversationMessage(finalizedMessages, {
      id: `agent-local-cancelled-${input.hostId}-${nextSubmissionNonce}`,
      role: 'assistant',
      content: cancellationMessage,
      status: 'error',
      created_at: new Date().toISOString(),
    })
  })
  input.setSubmitError(null)
  input.setIsSubmitting(false)
  input.setIsResponseCancellable(false)
  input.unblockAiWidget()
}
