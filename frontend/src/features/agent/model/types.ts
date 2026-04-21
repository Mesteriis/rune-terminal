export type ChatMode = 'chat' | 'dev' | 'debug'

export type MessageMeta = {
  provider?: string
  model?: string
  status?: string
  reasoning?: string
  prompt?: string
  summary?: string
}

export type ChatMessageView = {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: MessageMeta
}

export type AiPanelWidgetState = {
  title: string
  toolbarLabel: string
  activeTool: string
  messages: ChatMessageView[]
  composerPlaceholder: string
}
