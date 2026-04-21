import type {
  ApprovalMessage,
  ApprovalState,
  AuditEntry,
  AuditMessage,
  ChatMessageView,
  PlanMessage,
  PlanTool,
  QuestionnaireMessage,
} from '@/features/agent/model/types'

export type PendingInteractionFlow = {
  approvalMessageID?: string
  auditMessageID?: string
  auditProgressed: boolean
  flowID: string
  prompt: string
  questionnaireMessageID?: string
  tools: PlanTool[]
}

export type LocalSortKeyGenerator = () => number

const ENVIRONMENT_OPTIONS = [
  { label: 'Production', value: 'production' },
  { label: 'Staging', value: 'staging' },
  { label: 'Development', value: 'development' },
] as const

function dedupeTools(tools: PlanTool[]) {
  const seen = new Set<string>()

  return tools.filter((tool) => {
    if (seen.has(tool.name)) {
      return false
    }

    seen.add(tool.name)
    return true
  })
}

function buildPlanTools(prompt: string): PlanTool[] {
  const normalizedPrompt = prompt.toLowerCase()
  const tools: PlanTool[] = []

  if (
    normalizedPrompt.includes('config') ||
    normalizedPrompt.includes('file') ||
    normalizedPrompt.includes('read')
  ) {
    tools.push({
      name: 'read_file',
      description: 'Inspect the relevant project files before execution.',
    })
  }

  if (
    normalizedPrompt.includes('api') ||
    normalizedPrompt.includes('http') ||
    normalizedPrompt.includes('request') ||
    normalizedPrompt.includes('fetch')
  ) {
    tools.push({
      name: 'http_request',
      description: 'Call the required backend or external API.',
    })
  }

  if (
    normalizedPrompt.includes('save') ||
    normalizedPrompt.includes('write') ||
    normalizedPrompt.includes('update') ||
    normalizedPrompt.includes('persist')
  ) {
    tools.push({
      name: 'save_result',
      description: 'Persist the resulting change after the checks pass.',
    })
  }

  if (
    normalizedPrompt.includes('deploy') ||
    normalizedPrompt.includes('run') ||
    normalizedPrompt.includes('execute')
  ) {
    tools.push({
      name: 'execute_plan',
      description: 'Run the approved execution step.',
    })
  }

  if (tools.length === 0) {
    tools.push(
      {
        name: 'read_file',
        description: 'Inspect the current slice before changing it.',
      },
      {
        name: 'execute_plan',
        description: 'Run the approved action against the current context.',
      },
    )
  }

  return dedupeTools(tools)
}

function buildPlanSteps(prompt: string, needsQuestionnaire: boolean, answer?: string) {
  const normalizedPrompt = prompt.toLowerCase()
  const steps: string[] = []

  if (needsQuestionnaire && !answer) {
    steps.push('Confirm the target environment')
  }

  if (
    normalizedPrompt.includes('config') ||
    normalizedPrompt.includes('file') ||
    normalizedPrompt.includes('read')
  ) {
    steps.push('Read config')
  }

  if (
    normalizedPrompt.includes('api') ||
    normalizedPrompt.includes('http') ||
    normalizedPrompt.includes('request') ||
    normalizedPrompt.includes('fetch')
  ) {
    steps.push('Call API')
  }

  if (
    normalizedPrompt.includes('save') ||
    normalizedPrompt.includes('write') ||
    normalizedPrompt.includes('update') ||
    normalizedPrompt.includes('persist')
  ) {
    steps.push('Save result')
  }

  if (steps.length === 0) {
    steps.push('Inspect the request', 'Run the approved execution', 'Summarize the result')
  }

  if (answer) {
    steps.unshift(`Target environment: ${answer}`)
  }

  return Array.from(new Set(steps))
}

function needsEnvironmentQuestionnaire(prompt: string) {
  const normalizedPrompt = prompt.toLowerCase()
  const mentionsEnvironment =
    normalizedPrompt.includes('deploy') ||
    normalizedPrompt.includes('environment') ||
    normalizedPrompt.includes('release')
  const alreadySpecified =
    normalizedPrompt.includes('production') ||
    normalizedPrompt.includes('staging') ||
    normalizedPrompt.includes('development') ||
    normalizedPrompt.includes('dev')

  return mentionsEnvironment && !alreadySpecified
}

export function createPlanMessage(
  flowID: string,
  prompt: string,
  nextSortKey: LocalSortKeyGenerator,
  answer?: string,
): PlanMessage {
  const needsQuestionnaire = needsEnvironmentQuestionnaire(prompt)

  return {
    id: `${flowID}-plan`,
    type: 'plan',
    planId: flowID,
    steps: buildPlanSteps(prompt, needsQuestionnaire, answer),
    tools: buildPlanTools(prompt),
    sortKey: nextSortKey(),
  }
}

export function createApprovalMessage(
  flowID: string,
  nextSortKey: LocalSortKeyGenerator,
  status: ApprovalState = 'pending',
): ApprovalMessage {
  return {
    id: `${flowID}-approval`,
    type: 'approval',
    planId: flowID,
    status,
    sortKey: nextSortKey(),
  }
}

export function createQuestionnaireMessage(
  flowID: string,
  nextSortKey: LocalSortKeyGenerator,
): QuestionnaireMessage {
  return {
    id: `${flowID}-questionnaire`,
    type: 'questionnaire',
    question: 'Choose environment:',
    options: [...ENVIRONMENT_OPTIONS],
    allowCustom: true,
    status: 'pending',
    sortKey: nextSortKey(),
  }
}

export function createAuditMessage(
  flowID: string,
  tools: PlanTool[],
  nextSortKey: LocalSortKeyGenerator,
): AuditMessage {
  return {
    id: `${flowID}-audit`,
    type: 'audit',
    entries: tools.map((tool, index) => ({
      tool: tool.name,
      status: index === 0 ? 'running' : 'pending',
      timestamp: index === 0 ? Date.now() : undefined,
    })),
    sortKey: nextSortKey(),
  }
}

export function createPendingInteractionFlow(
  hostID: string,
  prompt: string,
  sequence: number,
  nextSortKey: LocalSortKeyGenerator,
): {
  flow: PendingInteractionFlow
  messages: ChatMessageView[]
} {
  const flowID = `agent-flow-${hostID}-${sequence}`
  const planMessage = createPlanMessage(flowID, prompt, nextSortKey)
  const questionnaireMessage = needsEnvironmentQuestionnaire(prompt)
    ? createQuestionnaireMessage(flowID, nextSortKey)
    : null
  const approvalMessage = questionnaireMessage ? null : createApprovalMessage(flowID, nextSortKey)

  return {
    flow: {
      approvalMessageID: approvalMessage?.id,
      auditProgressed: false,
      flowID,
      prompt,
      questionnaireMessageID: questionnaireMessage?.id,
      tools: planMessage.tools,
    },
    messages: [approvalMessage, questionnaireMessage, planMessage].filter(Boolean) as ChatMessageView[],
  }
}

export function updateApprovalMessageStatus(
  message: ApprovalMessage,
  status: ApprovalState,
  nextSortKey: LocalSortKeyGenerator,
): ApprovalMessage {
  return {
    ...message,
    status,
    sortKey: nextSortKey(),
  }
}

export function updateQuestionnaireMessageAnswer(
  message: QuestionnaireMessage,
  answer: string,
  nextSortKey: LocalSortKeyGenerator,
): QuestionnaireMessage {
  return {
    ...message,
    answer,
    status: 'answered',
    sortKey: nextSortKey(),
  }
}

export function advanceAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  const runningIndex = entries.findIndex((entry) => entry.status === 'running')

  if (runningIndex < 0) {
    return entries
  }

  const nextPendingIndex = entries.findIndex(
    (entry, index) => index > runningIndex && entry.status === 'pending',
  )

  if (nextPendingIndex < 0) {
    return entries
  }

  return entries.map((entry, index) => {
    if (index === runningIndex) {
      return {
        ...entry,
        status: 'done',
        timestamp: Date.now(),
      }
    }

    if (index === nextPendingIndex) {
      return {
        ...entry,
        status: 'running',
        timestamp: Date.now(),
      }
    }

    return entry
  })
}

export function completeAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  return entries.map((entry) => ({
    ...entry,
    status: 'done',
    timestamp: Date.now(),
  }))
}

export function failAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  const runningIndex = entries.findIndex((entry) => entry.status === 'running')
  const firstPendingIndex = entries.findIndex((entry) => entry.status === 'pending')
  const targetIndex = runningIndex >= 0 ? runningIndex : firstPendingIndex

  if (targetIndex < 0) {
    return entries
  }

  return entries.map((entry, index) =>
    index === targetIndex
      ? {
          ...entry,
          status: 'error',
          timestamp: Date.now(),
        }
      : entry,
  )
}
