export type ChatMode = 'chat' | 'dev' | 'debug'
export type MessageIntent = 'chat' | 'execution' | 'question'

export type MessageMeta = {
  provider?: string
  model?: string
  status?: string
  reasoning?: string
  prompt?: string
  summary?: string
}

export type ChatMessageSortKey = number

export type ChatTextMessage = {
  id: string
  type: 'chat'
  role: 'user' | 'assistant'
  content: string
  meta?: MessageMeta
  sortKey?: ChatMessageSortKey
}

export type PlanTool = {
  name: string
  description?: string
}

export type PlanMessage = {
  id: string
  type: 'plan'
  planId: string
  steps: string[]
  tools: PlanTool[]
  sortKey?: ChatMessageSortKey
}

export type ApprovalState = 'pending' | 'approved' | 'cancelled'

export type ApprovalMessage = {
  id: string
  type: 'approval'
  planId: string
  status: ApprovalState
  sortKey?: ChatMessageSortKey
}

export type AuditEntryStatus = 'pending' | 'running' | 'done' | 'error'

export type AuditEntry = {
  tool: string
  status: AuditEntryStatus
  timestamp?: number
}

export type AuditMessage = {
  id: string
  type: 'audit'
  entries: AuditEntry[]
  sortKey?: ChatMessageSortKey
}

export type QuestionnaireOption = {
  label: string
  value: string
}

export type QuestionnaireMessage = {
  id: string
  type: 'questionnaire'
  question: string
  options: QuestionnaireOption[]
  allowCustom: boolean
  answer?: string
  status: 'pending' | 'answered'
  sortKey?: ChatMessageSortKey
}

export type ChatMessageView =
  | ChatTextMessage
  | PlanMessage
  | ApprovalMessage
  | AuditMessage
  | QuestionnaireMessage

export type AiPanelWidgetState = {
  title: string
  toolbarLabel: string
  activeTool: string
  messages: ChatMessageView[]
  composerPlaceholder: string
}

export type AiContextWidgetOption = {
  value: string
  label: string
}
