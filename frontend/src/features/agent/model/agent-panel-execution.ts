import {
  executeAgentTool,
  explainTerminalCommand,
  planTerminalCommand,
  type AgentConversationSnapshot,
} from '@/features/agent/api/client'
import {
  deduplicateWidgetIDs,
  filterContextWidgetSelection,
  resolveContextTerminalWidget,
} from '@/features/agent/model/agent-panel-context'
import {
  createApprovalMessage,
  createPlanMessage,
  type PendingInteractionFlow,
  type PendingRunApproval,
} from '@/features/agent/model/interaction-flow'
import { sortMessagesBySortKey } from '@/features/agent/model/chat-message-utils'
import {
  getApprovalToken,
  getRunCommand,
  targetSessionForConnectionKind,
  waitForTerminalOutput,
} from '@/features/agent/model/agent-panel-terminal'
import type { ChatMessageSortKey, ChatMessageView, AiContextWidgetOption } from '@/features/agent/model/types'
import { fetchTerminalSnapshot } from '@/features/terminal/api/client'
import {
  resolveTerminalPanelBinding,
  type TerminalPanelBindings,
} from '@/features/terminal/model/panel-registry'
import type { WorkspaceWidgetSnapshot } from '@/shared/api/workspace'

export type TerminalExecutionTarget = {
  baselineNextSeq: number
  targetConnectionID: string
  targetSession: string
  targetWidgetID: string
}

type ExecutionDeps = {
  createApprovalMessage: typeof createApprovalMessage
  createPlanMessage: typeof createPlanMessage
  deduplicateWidgetIDs: typeof deduplicateWidgetIDs
  executeAgentTool: typeof executeAgentTool
  explainTerminalCommand: typeof explainTerminalCommand
  fetchTerminalSnapshot: typeof fetchTerminalSnapshot
  filterContextWidgetSelection: typeof filterContextWidgetSelection
  getApprovalToken: typeof getApprovalToken
  getRunCommand: typeof getRunCommand
  planTerminalCommand: typeof planTerminalCommand
  resolveContextTerminalWidget: typeof resolveContextTerminalWidget
  resolveTerminalPanelBinding: typeof resolveTerminalPanelBinding
  sortMessagesBySortKey: typeof sortMessagesBySortKey
  targetSessionForConnectionKind: typeof targetSessionForConnectionKind
  waitForTerminalOutput: typeof waitForTerminalOutput
}

const defaultDeps: ExecutionDeps = {
  createApprovalMessage,
  createPlanMessage,
  deduplicateWidgetIDs,
  executeAgentTool,
  explainTerminalCommand,
  fetchTerminalSnapshot,
  filterContextWidgetSelection,
  getApprovalToken,
  getRunCommand,
  planTerminalCommand,
  resolveContextTerminalWidget,
  resolveTerminalPanelBinding,
  sortMessagesBySortKey,
  targetSessionForConnectionKind,
  waitForTerminalOutput,
}

type ResolveTerminalExecutionTargetInput = {
  activeWidgetHostId: string
  contextWidgetOptions: AiContextWidgetOption[]
  ensureVisibleTerminalTarget?: (input: {
    requestedWidgetId?: string
    requestedWidgetTitle?: string
  }) => Promise<{
    widgetId: string
  } | null>
  hasLoadedContextWidgets: boolean
  isWidgetContextEnabled: boolean
  loadContextWidgets: () => Promise<{
    activeWidgetID: string
    options: AiContextWidgetOption[]
    widgets: WorkspaceWidgetSnapshot[]
  }>
  resolveCurrentContextWidgetID: (
    options: AiContextWidgetOption[],
    nextWorkspaceActiveWidgetID?: string,
  ) => string
  storedContextWidgetIDs: string[]
  terminalPanelBindings: TerminalPanelBindings
  workspaceActiveWidgetID: string
  workspaceWidgets: WorkspaceWidgetSnapshot[]
}

export async function resolveTerminalExecutionTargetForPanel(
  input: ResolveTerminalExecutionTargetInput,
  deps: ExecutionDeps = defaultDeps,
): Promise<TerminalExecutionTarget> {
  const shouldResolveFromContext =
    input.isWidgetContextEnabled && (input.storedContextWidgetIDs.length > 0 || input.hasLoadedContextWidgets)
  let contextTerminal: WorkspaceWidgetSnapshot | null = null

  if (shouldResolveFromContext) {
    const contextSnapshot = input.hasLoadedContextWidgets
      ? {
          activeWidgetID: input.workspaceActiveWidgetID,
          options: input.contextWidgetOptions,
          widgets: input.workspaceWidgets,
        }
      : await input.loadContextWidgets()
    const activeContextTerminalID = input.resolveCurrentContextWidgetID(
      contextSnapshot.options,
      contextSnapshot.activeWidgetID,
    )
    const selectedContextWidgetIDs =
      contextSnapshot.options.length > 0
        ? deps.filterContextWidgetSelection(input.storedContextWidgetIDs, contextSnapshot.options)
        : deps.deduplicateWidgetIDs(input.storedContextWidgetIDs)
    const contextTerminalCandidates =
      selectedContextWidgetIDs.length > 0
        ? deps.deduplicateWidgetIDs([
            ...selectedContextWidgetIDs,
            ...(selectedContextWidgetIDs.includes(activeContextTerminalID) ? [activeContextTerminalID] : []),
          ])
        : [activeContextTerminalID]
    contextTerminal = deps.resolveContextTerminalWidget(contextSnapshot.widgets, contextTerminalCandidates)
  }

  const fallbackTerminal = deps.resolveTerminalPanelBinding(
    input.terminalPanelBindings,
    input.activeWidgetHostId,
  )
  const hasVisibleContextTerminal =
    contextTerminal != null &&
    Object.values(input.terminalPanelBindings).some(
      (binding) => binding.runtimeWidgetId === contextTerminal?.id,
    )
  const requestedWidgetTitle =
    contextTerminal?.title?.trim() ||
    (fallbackTerminal?.preset === 'main' ? 'Main terminal' : 'Workspace shell')
  let targetWidgetID = contextTerminal?.id ?? fallbackTerminal?.runtimeWidgetId ?? ''
  const needsVisibleTerminalTarget =
    !targetWidgetID || (contextTerminal != null && !hasVisibleContextTerminal)

  if (input.ensureVisibleTerminalTarget && needsVisibleTerminalTarget) {
    const ensuredTarget = await input.ensureVisibleTerminalTarget({
      requestedWidgetId: targetWidgetID || undefined,
      requestedWidgetTitle,
    })
    const ensuredWidgetID = ensuredTarget?.widgetId?.trim() ?? ''

    if (ensuredWidgetID !== '') {
      targetWidgetID = ensuredWidgetID
    }
  }

  if (!targetWidgetID) {
    throw new Error('No terminal widget is available for execution.')
  }

  const baselineSnapshot = await deps.fetchTerminalSnapshot(targetWidgetID)
  const targetSession = deps.targetSessionForConnectionKind(baselineSnapshot.state.connection_kind)
  const targetConnectionID =
    baselineSnapshot.state.connection_id?.trim() || (targetSession === 'local' ? 'local' : '')

  if (!targetConnectionID) {
    throw new Error(`Terminal ${targetWidgetID} has no active connection id.`)
  }

  return {
    baselineNextSeq: baselineSnapshot.next_seq,
    targetConnectionID,
    targetSession,
    targetWidgetID,
  }
}

type RunTerminalPromptInput = {
  activeSubmissionSignal?: AbortSignal
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  createConversationContext: (input: {
    actionSource: string
    activeWidgetID?: string
    repoRoot: string
    targetConnectionID?: string
    targetSession?: string
    includeActiveWidgetInSelection?: boolean
  }) => {
    action_source: string
    active_widget_id: string
    repo_root: string
    target_connection_id?: string
    target_session?: string
    widget_context_enabled: boolean
    widget_ids?: string[]
  }
  hostId: string
  nextFlowSequence: () => number
  nextLocalSortKey: () => ChatMessageSortKey
  prompt: string
  refreshConversationList: () => Promise<unknown>
  repoRoot: string
  resolveTerminalExecutionTarget: () => Promise<TerminalExecutionTarget>
  setInteractionMessages: (update: (currentMessages: ChatMessageView[]) => ChatMessageView[]) => void
  setPendingFlow: (flow: PendingInteractionFlow | null) => void
  setPendingFlowRef: (flow: PendingInteractionFlow | null) => void
  setSubmitError: (error: string | null) => void
}

export async function runTerminalPromptForPanel(
  input: RunTerminalPromptInput,
  deps: ExecutionDeps = defaultDeps,
) {
  const command = deps.getRunCommand(input.prompt)

  if (command == null) {
    return false
  }

  if (command === '') {
    throw new Error('Usage: /run <command>')
  }

  const resolvedTarget = await input.resolveTerminalExecutionTarget()

  const executionContext = {
    action_source: 'frontend.ai.sidebar.run',
    active_widget_id: resolvedTarget.targetWidgetID,
    repo_root: input.repoRoot,
    target_connection_id: resolvedTarget.targetConnectionID,
    target_session: resolvedTarget.targetSession,
  }

  const executionResponse = await deps.executeAgentTool({
    context: executionContext,
    input: {
      append_newline: true,
      text: command,
      widget_id: resolvedTarget.targetWidgetID,
    },
    tool_name: 'term.send_input',
  })

  if (executionResponse.status === 'requires_confirmation') {
    const pendingApproval = executionResponse.pending_approval
    if (!pendingApproval?.id) {
      throw new Error('Confirmation required before /run can continue, but no approval id was returned.')
    }

    const flowID = `agent-run-${input.hostId}-${input.nextFlowSequence()}`
    const summary = pendingApproval.summary?.trim() || `Run ${command}`
    const tools = [{ name: 'term.send_input', description: summary }]
    const planMessage = deps.createPlanMessage(flowID, input.prompt, tools, input.nextLocalSortKey)
    const approvalMessage = deps.createApprovalMessage(flowID, input.nextLocalSortKey)
    const runApproval: PendingRunApproval = {
      approvalID: pendingApproval.id,
      baselineNextSeq: resolvedTarget.baselineNextSeq,
      command,
      prompt: input.prompt,
      repoRoot: input.repoRoot,
      targetConnectionID: resolvedTarget.targetConnectionID,
      targetSession: resolvedTarget.targetSession,
      targetWidgetID: resolvedTarget.targetWidgetID,
    }
    const nextFlow: PendingInteractionFlow = {
      approvalMessageID: approvalMessage.id,
      auditProgressed: false,
      flowID,
      prompt: input.prompt,
      runApproval,
      tools,
    }

    input.setPendingFlowRef(nextFlow)
    input.setPendingFlow(nextFlow)
    input.setInteractionMessages((currentMessages) =>
      deps.sortMessagesBySortKey([...currentMessages, planMessage, approvalMessage]),
    )
    return true
  }

  if (executionResponse.status !== 'ok') {
    throw new Error(executionResponse.error?.trim() || 'Unable to execute /run command.')
  }

  await deps.waitForTerminalOutput(
    resolvedTarget.targetWidgetID,
    resolvedTarget.baselineNextSeq,
    input.activeSubmissionSignal,
  )

  const explainResponse = await deps.explainTerminalCommand({
    command,
    context: input.createConversationContext({
      actionSource: executionContext.action_source,
      activeWidgetID: resolvedTarget.targetWidgetID,
      includeActiveWidgetInSelection: true,
      repoRoot: input.repoRoot,
      targetConnectionID: resolvedTarget.targetConnectionID,
      targetSession: resolvedTarget.targetSession,
    }),
    from_seq: resolvedTarget.baselineNextSeq,
    prompt: input.prompt,
    widget_id: resolvedTarget.targetWidgetID,
  })

  input.applyConversationSnapshot(explainResponse.conversation)
  await input.refreshConversationList()

  if (explainResponse.provider_error?.trim()) {
    input.setSubmitError(explainResponse.provider_error.trim())
  }

  return true
}

type RunApprovedTerminalPromptInput = {
  activeSubmissionSignal?: AbortSignal
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  createConversationContext: RunTerminalPromptInput['createConversationContext']
  refreshConversationList: () => Promise<unknown>
  runApproval: PendingRunApproval
  setSubmitError: (error: string | null) => void
}

export async function runApprovedTerminalPromptForPanel(
  input: RunApprovedTerminalPromptInput,
  approvalToken: string,
  deps: ExecutionDeps = defaultDeps,
) {
  const executionResponse = await deps.executeAgentTool({
    approval_token: approvalToken,
    context: {
      action_source: 'frontend.ai.sidebar.run',
      active_widget_id: input.runApproval.targetWidgetID,
      repo_root: input.runApproval.repoRoot,
      target_connection_id: input.runApproval.targetConnectionID,
      target_session: input.runApproval.targetSession,
    },
    input: {
      append_newline: true,
      text: input.runApproval.command,
      widget_id: input.runApproval.targetWidgetID,
    },
    tool_name: 'term.send_input',
  })

  if (executionResponse.status === 'requires_confirmation') {
    throw new Error('Confirmed /run execution still requires approval.')
  }

  if (executionResponse.status !== 'ok') {
    throw new Error(executionResponse.error?.trim() || 'Unable to execute approved /run command.')
  }

  await deps.waitForTerminalOutput(
    input.runApproval.targetWidgetID,
    input.runApproval.baselineNextSeq,
    input.activeSubmissionSignal,
  )

  const explainResponse = await deps.explainTerminalCommand({
    command: input.runApproval.command,
    context: input.createConversationContext({
      actionSource: 'frontend.ai.sidebar.run',
      activeWidgetID: input.runApproval.targetWidgetID,
      includeActiveWidgetInSelection: true,
      repoRoot: input.runApproval.repoRoot,
      targetConnectionID: input.runApproval.targetConnectionID,
      targetSession: input.runApproval.targetSession,
    }),
    from_seq: input.runApproval.baselineNextSeq,
    prompt: input.runApproval.prompt ?? `/run ${input.runApproval.command}`,
    widget_id: input.runApproval.targetWidgetID,
  })

  input.applyConversationSnapshot(explainResponse.conversation)
  await input.refreshConversationList()

  if (explainResponse.provider_error?.trim()) {
    input.setSubmitError(explainResponse.provider_error.trim())
  }
}

type RunApprovedExecutionPlanInput = {
  activeSubmissionSignal?: AbortSignal
  applyConversationSnapshot: (snapshot: AgentConversationSnapshot) => void
  createConversationContext: RunTerminalPromptInput['createConversationContext']
  createToolExecutionContext: (input: {
    actionSource: string
    activeWidgetID?: string
    repoRoot: string
    targetConnectionID?: string
    targetSession?: string
    includeActiveWidgetInSelection?: boolean
  }) => {
    action_source: string
    active_widget_id: string
    repo_root: string
    target_connection_id?: string
    target_session?: string
  }
  model?: string
  prompt: string
  refreshConversationList: () => Promise<unknown>
  repoRoot: string
  resolveTerminalExecutionTarget: () => Promise<TerminalExecutionTarget>
  setSubmitError: (error: string | null) => void
}

export async function runApprovedExecutionPlanForPanel(
  input: RunApprovedExecutionPlanInput,
  deps: ExecutionDeps = defaultDeps,
) {
  const resolvedTarget = await input.resolveTerminalExecutionTarget()
  const planningContext = input.createConversationContext({
    actionSource: 'frontend.ai.sidebar.execute',
    activeWidgetID: resolvedTarget.targetWidgetID,
    includeActiveWidgetInSelection: true,
    repoRoot: input.repoRoot,
    targetConnectionID: resolvedTarget.targetConnectionID,
    targetSession: resolvedTarget.targetSession,
  })
  const executionContext = input.createToolExecutionContext({
    actionSource: 'frontend.ai.sidebar.execute',
    activeWidgetID: resolvedTarget.targetWidgetID,
    includeActiveWidgetInSelection: true,
    repoRoot: input.repoRoot,
    targetConnectionID: resolvedTarget.targetConnectionID,
    targetSession: resolvedTarget.targetSession,
  })
  const plannedCommand = await deps.planTerminalCommand({
    context: planningContext,
    model: input.model,
    prompt: input.prompt,
    widget_id: resolvedTarget.targetWidgetID,
  })
  const command = plannedCommand.command.trim()

  if (!command) {
    throw new Error('Terminal command planning did not return a runnable command.')
  }

  let executionResponse = await deps.executeAgentTool({
    context: executionContext,
    input: {
      append_newline: true,
      text: command,
      widget_id: resolvedTarget.targetWidgetID,
    },
    tool_name: 'term.send_input',
  })

  if (executionResponse.status === 'requires_confirmation') {
    const pendingApproval = executionResponse.pending_approval
    if (!pendingApproval?.id) {
      throw new Error('Approval confirmation did not return a terminal execution approval id.')
    }

    const confirmationResponse = await deps.executeAgentTool({
      context: {
        ...executionContext,
        action_source: 'frontend.ai.sidebar.execute.confirm',
      },
      input: {
        approval_id: pendingApproval.id,
      },
      tool_name: 'safety.confirm',
    })

    if (confirmationResponse.status !== 'ok') {
      throw new Error(
        confirmationResponse.error?.trim() || 'Unable to confirm the planned terminal execution.',
      )
    }

    executionResponse = await deps.executeAgentTool({
      approval_token: deps.getApprovalToken(confirmationResponse),
      context: executionContext,
      input: {
        append_newline: true,
        text: command,
        widget_id: resolvedTarget.targetWidgetID,
      },
      tool_name: 'term.send_input',
    })
  }

  if (executionResponse.status !== 'ok') {
    throw new Error(executionResponse.error?.trim() || 'Unable to execute the approved terminal plan.')
  }

  await deps.waitForTerminalOutput(
    resolvedTarget.targetWidgetID,
    resolvedTarget.baselineNextSeq,
    input.activeSubmissionSignal,
  )

  const explainResponse = await deps.explainTerminalCommand({
    command,
    context: planningContext,
    from_seq: resolvedTarget.baselineNextSeq,
    prompt: input.prompt,
    widget_id: resolvedTarget.targetWidgetID,
  })

  input.applyConversationSnapshot(explainResponse.conversation)
  await input.refreshConversationList()

  if (explainResponse.provider_error?.trim()) {
    input.setSubmitError(explainResponse.provider_error.trim())
  }
}
