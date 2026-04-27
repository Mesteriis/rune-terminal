import { executeAgentTool } from '@/features/agent/api/client'
import {
  classifyMessageIntent,
  completeAuditEntries,
  createApprovalMessage,
  createAuditMessage,
  createPlanMessage,
  failAuditEntries,
  updateApprovalMessageStatus,
  updateQuestionnaireMessageAnswer,
  type PendingInteractionFlow,
  type PendingRunApproval,
} from '@/features/agent/model/interaction-flow'
import { sortMessagesBySortKey } from '@/features/agent/model/chat-message-utils'
import { getApprovalToken, getErrorMessage } from '@/features/agent/model/agent-panel-terminal'
import { resolveRuntimeContext } from '@/shared/api/runtime'
import type {
  ApprovalMessage,
  ChatMessageSortKey,
  ChatMessageView,
  QuestionnaireMessage,
} from '@/features/agent/model/types'

type ApprovalDeps = {
  classifyMessageIntent: typeof classifyMessageIntent
  completeAuditEntries: typeof completeAuditEntries
  createApprovalMessage: typeof createApprovalMessage
  createAuditMessage: typeof createAuditMessage
  createPlanMessage: typeof createPlanMessage
  executeAgentTool: typeof executeAgentTool
  failAuditEntries: typeof failAuditEntries
  getApprovalToken: typeof getApprovalToken
  getErrorMessage: typeof getErrorMessage
  resolveRuntimeContext: typeof resolveRuntimeContext
  sortMessagesBySortKey: typeof sortMessagesBySortKey
  updateApprovalMessageStatus: typeof updateApprovalMessageStatus
  updateQuestionnaireMessageAnswer: typeof updateQuestionnaireMessageAnswer
}

const defaultDeps: ApprovalDeps = {
  classifyMessageIntent,
  completeAuditEntries,
  createApprovalMessage,
  createAuditMessage,
  createPlanMessage,
  executeAgentTool,
  failAuditEntries,
  getApprovalToken,
  getErrorMessage,
  resolveRuntimeContext,
  sortMessagesBySortKey,
  updateApprovalMessageStatus,
  updateQuestionnaireMessageAnswer,
}

type AnswerQuestionnaireInput = {
  answer: string
  clearPendingInteractionFlow: () => void
  getPendingFlow: () => PendingInteractionFlow | null
  hasTerminalExecutionContext: boolean
  message: QuestionnaireMessage
  nextLocalSortKey: () => ChatMessageSortKey
  runBackendPrompt: (
    prompt: string,
    options?: {
      attachments?: unknown[]
      auditMessageID?: string
      cancellable?: boolean
      model?: string
    },
  ) => Promise<void>
  selectedModel?: string
  setInteractionMessages: (update: (currentMessages: ChatMessageView[]) => ChatMessageView[]) => void
  setPendingFlow: (flow: PendingInteractionFlow | null) => void
  setPendingFlowRef: (flow: PendingInteractionFlow | null) => void
}

export async function answerQuestionnaireForPanel(
  input: AnswerQuestionnaireInput,
  deps: ApprovalDeps = defaultDeps,
) {
  const activeFlow = input.getPendingFlow()

  if (!activeFlow || activeFlow.questionnaireMessageID !== input.message.id) {
    return
  }

  const answeredMessage = deps.updateQuestionnaireMessageAnswer(
    input.message,
    input.answer,
    input.nextLocalSortKey,
  )
  const classification = deps.classifyMessageIntent(activeFlow.prompt, input.answer, {
    hasTerminalContext: input.hasTerminalExecutionContext,
  })

  if (classification.intent === 'chat') {
    input.setInteractionMessages((currentMessages) =>
      deps.sortMessagesBySortKey([
        ...currentMessages.filter((currentMessage) => currentMessage.id !== input.message.id),
        answeredMessage,
      ]),
    )
    input.clearPendingInteractionFlow()
    await input.runBackendPrompt(activeFlow.prompt, {
      attachments: activeFlow.attachments,
      model: input.selectedModel || undefined,
    })
    return
  }

  const planMessage = deps.createPlanMessage(
    activeFlow.flowID,
    activeFlow.prompt,
    classification.tools,
    input.nextLocalSortKey,
    input.answer,
  )
  const approvalMessage = deps.createApprovalMessage(activeFlow.flowID, input.nextLocalSortKey)

  input.setInteractionMessages((currentMessages) =>
    deps.sortMessagesBySortKey([
      ...currentMessages.filter((currentMessage) => currentMessage.id !== input.message.id),
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
  input.setPendingFlowRef(nextFlow)
  input.setPendingFlow(nextFlow)
}

type ApprovePendingPlanInput = {
  blockAiWidget: () => void
  clearPendingInteractionFlow: () => void
  getPendingFlow: () => PendingInteractionFlow | null
  hostId: string
  message: ApprovalMessage
  nextLocalSortKey: () => ChatMessageSortKey
  runApprovedExecutionPlan: (prompt: string, repoRoot: string, model?: string) => Promise<void>
  runApprovedTerminalPrompt: (runApproval: PendingRunApproval, approvalToken: string) => Promise<void>
  runBackendPrompt: (
    prompt: string,
    options?: {
      attachments?: unknown[]
      auditMessageID?: string
      cancellable?: boolean
      model?: string
    },
  ) => Promise<void>
  selectedModel?: string
  setInteractionMessages: (update: (currentMessages: ChatMessageView[]) => ChatMessageView[]) => void
  setIsResponseCancellable: (value: boolean) => void
  setIsSubmitting: (value: boolean) => void
  setPendingFlow: (flow: PendingInteractionFlow | null) => void
  setPendingFlowRef: (flow: PendingInteractionFlow | null) => void
  setSubmitError: (error: string | null) => void
  unblockAiWidget: () => void
  updateAuditMessageEntries: (
    auditMessageID: string,
    update: (message: { type: string; entries: unknown[] }) => unknown,
  ) => void
}

function createApprovedAuditFlow(
  activeFlow: PendingInteractionFlow,
  message: ApprovalMessage,
  auditMessageID: string,
) {
  const nextFlow: PendingInteractionFlow = {
    ...activeFlow,
    approvalMessageID: message.id,
    auditMessageID,
    auditProgressed: false,
  }
  return nextFlow
}

function applyAuditResult(
  auditMessageID: string,
  updateAuditMessageEntries: ApprovePendingPlanInput['updateAuditMessageEntries'],
  updateEntries: (entries: unknown[]) => unknown[],
) {
  updateAuditMessageEntries(auditMessageID, (currentMessage) =>
    currentMessage.type === 'audit'
      ? {
          ...currentMessage,
          entries: updateEntries(currentMessage.entries),
        }
      : currentMessage,
  )
}

export async function approvePendingPlanForPanel(
  input: ApprovePendingPlanInput,
  deps: ApprovalDeps = defaultDeps,
) {
  const activeFlow = input.getPendingFlow()

  if (!activeFlow || activeFlow.flowID !== input.message.planId) {
    return
  }

  const approvedMessage = deps.updateApprovalMessageStatus(input.message, 'approved', input.nextLocalSortKey)
  const auditMessage = deps.createAuditMessage(activeFlow.flowID, activeFlow.tools, input.nextLocalSortKey)

  if (activeFlow.runApproval) {
    const runApproval = activeFlow.runApproval
    const nextFlow = createApprovedAuditFlow(activeFlow, input.message, auditMessage.id)
    input.setPendingFlowRef(nextFlow)
    input.setPendingFlow(nextFlow)
    input.setInteractionMessages((currentMessages) =>
      deps.sortMessagesBySortKey([
        ...currentMessages.filter((currentMessage) => currentMessage.id !== input.message.id),
        approvedMessage,
        auditMessage,
      ]),
    )
    input.setIsSubmitting(true)
    input.setIsResponseCancellable(false)
    input.setSubmitError(null)
    input.blockAiWidget()

    try {
      const confirmationResponse = await deps.executeAgentTool({
        context: {
          action_source: 'frontend.ai.sidebar.run.confirm',
          active_widget_id: runApproval.targetWidgetID,
          repo_root: runApproval.repoRoot,
          target_connection_id: runApproval.targetConnectionID,
          target_session: runApproval.targetSession,
        },
        input: {
          approval_id: runApproval.approvalID,
        },
        tool_name: 'safety.confirm',
      })

      if (confirmationResponse.status !== 'ok') {
        throw new Error(confirmationResponse.error?.trim() || 'Unable to confirm /run approval.')
      }

      await input.runApprovedTerminalPrompt(runApproval, deps.getApprovalToken(confirmationResponse))
      applyAuditResult(auditMessage.id, input.updateAuditMessageEntries, deps.completeAuditEntries)
    } catch (error) {
      applyAuditResult(auditMessage.id, input.updateAuditMessageEntries, deps.failAuditEntries)
      input.setSubmitError(deps.getErrorMessage(error, 'Unable to run the approved terminal command.'))
    } finally {
      input.clearPendingInteractionFlow()
      input.unblockAiWidget()
      input.setIsSubmitting(false)
      input.setIsResponseCancellable(false)
    }
    return
  }

  const executesInTerminal = activeFlow.tools.some((tool) => tool.name === 'execute_terminal')

  if (executesInTerminal) {
    const nextFlow = createApprovedAuditFlow(activeFlow, input.message, auditMessage.id)
    input.setPendingFlowRef(nextFlow)
    input.setPendingFlow(nextFlow)
    input.setInteractionMessages((currentMessages) =>
      deps.sortMessagesBySortKey([
        ...currentMessages.filter((currentMessage) => currentMessage.id !== input.message.id),
        approvedMessage,
        auditMessage,
      ]),
    )
    input.setIsSubmitting(true)
    input.setIsResponseCancellable(false)
    input.setSubmitError(null)
    input.blockAiWidget()

    try {
      const runtimeContext = await deps.resolveRuntimeContext()
      await input.runApprovedExecutionPlan(
        activeFlow.prompt,
        runtimeContext.repoRoot,
        input.selectedModel || undefined,
      )
      applyAuditResult(auditMessage.id, input.updateAuditMessageEntries, deps.completeAuditEntries)
    } catch (error) {
      applyAuditResult(auditMessage.id, input.updateAuditMessageEntries, deps.failAuditEntries)
      input.setSubmitError(deps.getErrorMessage(error, 'Unable to run the approved terminal plan.'))
    } finally {
      input.clearPendingInteractionFlow()
      input.unblockAiWidget()
      input.setIsSubmitting(false)
      input.setIsResponseCancellable(false)
    }
    return
  }

  const nextFlow = createApprovedAuditFlow(activeFlow, input.message, auditMessage.id)
  input.setPendingFlowRef(nextFlow)
  input.setPendingFlow(nextFlow)
  input.setInteractionMessages((currentMessages) =>
    deps.sortMessagesBySortKey([
      ...currentMessages.filter((currentMessage) => currentMessage.id !== input.message.id),
      approvedMessage,
      auditMessage,
    ]),
  )
  input.clearPendingInteractionFlow()
  await input.runBackendPrompt(activeFlow.prompt, {
    attachments: activeFlow.attachments,
    auditMessageID: auditMessage.id,
    model: input.selectedModel || undefined,
  })
}
