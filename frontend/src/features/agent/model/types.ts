export type ChatMode = 'chat' | 'dev' | 'debug'

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

export type ChatMessageView = ChatTextMessage | PlanMessage

export type AiPanelWidgetState = {
  title: string
  toolbarLabel: string
  activeTool: string
  messages: ChatMessageView[]
  composerPlaceholder: string
}
