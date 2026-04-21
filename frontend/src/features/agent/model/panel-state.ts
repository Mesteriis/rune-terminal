import type {
  AgentConversationMessage,
  AgentConversationProvider,
  AgentConversationSnapshot,
  AgentConversationStreamEvent,
} from '@/features/agent/api/client'
import type { AiPanelWidgetState, AiPromptCardState } from '@/features/agent/model/types'

const AI_PANEL_TITLE = 'AI RUNE'
const AI_TOOLBAR_LABEL = 'TOOL BAR'
const AI_ACTIVE_TOOL = 'Chat'
const AI_COMPOSER_PLACEHOLDER = 'Text Area'

function createPanelState(prompts: AiPromptCardState[]): AiPanelWidgetState {
  return {
    title: AI_PANEL_TITLE,
    toolbarLabel: AI_TOOLBAR_LABEL,
    activeTool: AI_ACTIVE_TOOL,
    prompts,
    composerPlaceholder: AI_COMPOSER_PLACEHOLDER,
  }
}

function createStatusPrompt(input: {
  id: string
  title: string
  preview: string
  prompt?: string
  reasoning?: string[]
  summary: string
}): AiPromptCardState {
  return {
    id: input.id,
    title: input.title,
    current: {
      preview: input.preview,
      prompt: input.prompt ?? input.preview,
      reasoning: input.reasoning ?? [],
      summary: input.summary,
    },
  }
}

function capitalizeLabel(value: string) {
  if (!value) {
    return ''
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatConversationTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getUTCFullYear())
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function buildMessageReasoning(message: AgentConversationMessage) {
  const reasoning = [`Role: ${message.role}`, `Status: ${message.status}`]
  const createdAt = formatConversationTimestamp(message.created_at)

  if (createdAt) {
    reasoning.push(`Created: ${createdAt}`)
  }

  if (message.provider) {
    reasoning.push(`Provider: ${message.provider}`)
  }

  if (message.model) {
    reasoning.push(`Model: ${message.model}`)
  }

  if (message.attachments?.length) {
    reasoning.push(
      ...message.attachments.map((attachment) => `Attachment: ${attachment.name} (${attachment.path})`),
    )
  }

  return reasoning
}

function buildMessageSummary(message: AgentConversationMessage) {
  const summaryParts = [capitalizeLabel(message.role), message.status]
  const createdAt = formatConversationTimestamp(message.created_at)

  if (message.provider) {
    summaryParts.push(message.provider)
  }

  if (message.model) {
    summaryParts.push(message.model)
  }

  if (message.attachments?.length) {
    summaryParts.push(
      `${message.attachments.length} attachment${message.attachments.length === 1 ? '' : 's'}`,
    )
  }

  if (createdAt) {
    summaryParts.push(createdAt)
  }

  return summaryParts.join(' · ')
}

function mapConversationMessage(message: AgentConversationMessage, index: number): AiPromptCardState {
  const content = message.content.trim() || message.content || ''

  return {
    id: message.id,
    title: `${capitalizeLabel(message.role)} ${index + 1}`,
    current: {
      preview: content,
      prompt: content,
      reasoning: buildMessageReasoning(message),
      summary: buildMessageSummary(message),
    },
  }
}

export function createAgentPanelLoadingState() {
  return createPanelState([
    createStatusPrompt({
      id: 'agent-loading',
      title: 'Conversation',
      preview: 'Loading backend conversation.',
      reasoning: ['Route: GET /api/v1/agent/conversation'],
      summary: 'Loading',
    }),
  ])
}

export function createAgentPanelErrorState(message: string) {
  return createPanelState([
    createStatusPrompt({
      id: 'agent-error',
      title: 'Conversation',
      preview: message,
      reasoning: ['Route: GET /api/v1/agent/conversation'],
      summary: 'Backend error',
    }),
  ])
}

export function createAgentPanelStateFromConversation(
  snapshot: AgentConversationSnapshot,
): AiPanelWidgetState {
  return createAgentPanelStateFromMessages(snapshot.messages, snapshot.provider)
}

export function createAgentPanelStateFromMessages(
  messages: AgentConversationMessage[],
  provider?: AgentConversationProvider | null,
): AiPanelWidgetState {
  if (messages.length === 0) {
    const providerLabel = provider?.model
      ? `${provider.kind} · ${provider.model}`
      : (provider?.kind ?? 'backend')

    return createPanelState([
      createStatusPrompt({
        id: 'agent-empty',
        title: 'Conversation',
        preview: 'Backend conversation is empty.',
        reasoning: [
          `Provider: ${providerLabel}`,
          `Streaming: ${provider?.streaming ? 'enabled' : 'disabled'}`,
        ],
        summary: 'Waiting for the first backend message.',
      }),
    ])
  }

  return createPanelState(messages.map(mapConversationMessage))
}

function upsertConversationMessage(messages: AgentConversationMessage[], message: AgentConversationMessage) {
  const index = messages.findIndex((currentMessage) => currentMessage.id === message.id)

  if (index < 0) {
    return [...messages, message]
  }

  const nextMessages = [...messages]
  nextMessages[index] = message
  return nextMessages
}

function updateConversationMessage(
  messages: AgentConversationMessage[],
  messageID: string,
  update: (message: AgentConversationMessage) => AgentConversationMessage,
) {
  const index = messages.findIndex((message) => message.id === messageID)

  if (index < 0) {
    return messages
  }

  const nextMessages = [...messages]
  nextMessages[index] = update(nextMessages[index])
  return nextMessages
}

export function appendAgentConversationMessage(
  messages: AgentConversationMessage[],
  message: AgentConversationMessage,
) {
  return [...messages, message]
}

export function removeAgentConversationMessage(messages: AgentConversationMessage[], messageID: string) {
  return messages.filter((message) => message.id !== messageID)
}

export function finalizeAgentConversationStreamingMessages(
  messages: AgentConversationMessage[],
  errorMessage: string,
) {
  return messages.map((message) => {
    if (message.status !== 'streaming') {
      return message
    }

    const content = message.content.trim()

    return {
      ...message,
      content: content || errorMessage,
      status: 'error',
    }
  })
}

export function applyAgentConversationStreamEvent(
  messages: AgentConversationMessage[],
  event: AgentConversationStreamEvent,
) {
  switch (event.type) {
    case 'message-start':
      return upsertConversationMessage(messages, event.message)
    case 'text-delta':
      return updateConversationMessage(messages, event.message_id, (message) => ({
        ...message,
        content: `${message.content}${event.delta}`,
        status: 'streaming',
      }))
    case 'message-complete':
      return upsertConversationMessage(messages, event.message)
    case 'error':
      if (event.message) {
        return upsertConversationMessage(messages, event.message)
      }

      return finalizeAgentConversationStreamingMessages(
        messages,
        event.error?.trim() || 'Agent stream failed.',
      )
    default:
      return messages
  }
}

export function appendAgentPanelStatusPrompt(
  panelState: AiPanelWidgetState,
  input: {
    id: string
    title: string
    preview: string
    prompt?: string
    reasoning?: string[]
    summary: string
  },
) {
  return {
    ...panelState,
    prompts: [...panelState.prompts, createStatusPrompt(input)],
  }
}
