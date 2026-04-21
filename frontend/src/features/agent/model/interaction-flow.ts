import type {
  ApprovalMessage,
  ApprovalState,
  AuditEntry,
  AuditMessage,
  ChatMessageView,
  MessageIntent,
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
export type InteractionClassification = {
  intent: MessageIntent
  tools: PlanTool[]
}

const ENVIRONMENT_OPTIONS = [
  { label: 'Production', value: 'production' },
  { label: 'Staging', value: 'staging' },
  { label: 'Development', value: 'development' },
] as const

const READ_KEYWORDS = [
  'config',
  'file',
  'read',
  'open file',
  'inspect file',
  'файл',
  'прочитай',
  'прочесть',
  'читать',
  'конфиг',
] as const

const API_KEYWORDS = ['api', 'http', 'request', 'fetch', 'webhook', 'запрос', 'апи', 'вебхук'] as const

const SAVE_KEYWORDS = [
  'save',
  'write',
  'update',
  'persist',
  'edit',
  'change',
  'сохрани',
  'запиши',
  'обнови',
  'измени',
] as const

const EXECUTION_KEYWORDS = [
  'deploy',
  'run',
  'execute',
  'release',
  'apply',
  'migrate',
  'запусти',
  'выполни',
  'деплой',
  'релиз',
  'примени',
  'миграц',
] as const

const ENVIRONMENT_HINT_KEYWORDS = [
  'environment',
  'production',
  'staging',
  'development',
  'prod',
  'stage',
  'deploy',
  'release',
  'окружен',
  'прод',
  'стейдж',
  'разработк',
  'деплой',
  'релиз',
] as const

function containsAnyKeyword(value: string, keywords: readonly string[]) {
  return keywords.some((keyword) => value.includes(keyword))
}

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

  if (containsAnyKeyword(normalizedPrompt, READ_KEYWORDS)) {
    tools.push({
      name: 'read_file',
      description: 'Inspect the relevant project files before execution.',
    })
  }

  if (containsAnyKeyword(normalizedPrompt, API_KEYWORDS)) {
    tools.push({
      name: 'http_request',
      description: 'Call the required backend or external API.',
    })
  }

  if (containsAnyKeyword(normalizedPrompt, SAVE_KEYWORDS)) {
    tools.push({
      name: 'save_result',
      description: 'Persist the resulting change after the checks pass.',
    })
  }

  if (containsAnyKeyword(normalizedPrompt, EXECUTION_KEYWORDS)) {
    tools.push({
      name: 'execute_plan',
      description: 'Run the approved execution step.',
    })
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

function needsEnvironmentQuestionnaire(prompt: string, answer?: string) {
  const normalizedPrompt = prompt.toLowerCase()
  const normalizedAnswer = answer?.trim().toLowerCase() ?? ''
  const mentionsEnvironment = containsAnyKeyword(normalizedPrompt, ENVIRONMENT_HINT_KEYWORDS)
  const hasExplicitEnvironment = containsAnyKeyword(`${normalizedPrompt}\n${normalizedAnswer}`, [
    'production',
    'staging',
    'development',
    'dev',
    'prod',
    'stage',
    'прод',
    'стейдж',
    'разработк',
  ])

  return mentionsEnvironment && !hasExplicitEnvironment
}

export function classifyMessageIntent(prompt: string, answer?: string): InteractionClassification {
  const tools = buildPlanTools(prompt)

  if (needsEnvironmentQuestionnaire(prompt, answer) && tools.length > 0) {
    return {
      intent: 'question',
      tools,
    }
  }

  if (tools.length === 0) {
    return {
      intent: 'chat',
      tools: [],
    }
  }

  return {
    intent: 'execution',
    tools,
  }
}

export function createPlanMessage(
  flowID: string,
  prompt: string,
  tools: PlanTool[],
  nextSortKey: LocalSortKeyGenerator,
  answer?: string,
): PlanMessage {
  const needsQuestionnaire = needsEnvironmentQuestionnaire(prompt, answer)

  return {
    id: `${flowID}-plan`,
    type: 'plan',
    planId: flowID,
    steps: buildPlanSteps(prompt, needsQuestionnaire, answer),
    tools,
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
  answer?: string,
): {
  classification: InteractionClassification
  flow: PendingInteractionFlow | null
  messages: ChatMessageView[]
} {
  const flowID = `agent-flow-${hostID}-${sequence}`
  const classification = classifyMessageIntent(prompt, answer)

  if (classification.intent === 'chat') {
    return {
      classification,
      flow: null,
      messages: [],
    }
  }

  if (classification.intent === 'question') {
    const questionnaireMessage = createQuestionnaireMessage(flowID, nextSortKey)

    return {
      classification,
      flow: {
        auditProgressed: false,
        flowID,
        prompt,
        questionnaireMessageID: questionnaireMessage.id,
        tools: classification.tools,
      },
      messages: [questionnaireMessage],
    }
  }

  const planMessage = createPlanMessage(flowID, prompt, classification.tools, nextSortKey, answer)
  const approvalMessage = createApprovalMessage(flowID, nextSortKey)

  return {
    classification,
    flow: {
      approvalMessageID: approvalMessage?.id,
      auditProgressed: false,
      flowID,
      prompt,
      tools: classification.tools,
    },
    messages: [planMessage, approvalMessage],
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
