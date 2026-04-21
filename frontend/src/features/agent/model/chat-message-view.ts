import type { AgentConversationMessage } from '@/features/agent/api/client'
import type { ChatMessageView, MessageMeta } from '@/features/agent/model/types'

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

function createConversationMessageSortKey(timestamp: string, fallbackIndex = 0) {
  const value = Date.parse(timestamp)

  if (Number.isNaN(value)) {
    return fallbackIndex
  }

  return value * 1000 + fallbackIndex
}

function buildAssistantReasoning(message: AgentConversationMessage) {
  const reasoningLines = [`Status: ${message.status}`]
  const createdAt = formatConversationTimestamp(message.created_at)

  if (createdAt) {
    reasoningLines.push(`Created: ${createdAt}`)
  }

  if (message.provider) {
    reasoningLines.push(`Provider: ${message.provider}`)
  }

  if (message.model) {
    reasoningLines.push(`Model: ${message.model}`)
  }

  if (message.attachments?.length) {
    reasoningLines.push(
      ...message.attachments.map((attachment) => `Attachment: ${attachment.name} (${attachment.path})`),
    )
  }

  return reasoningLines.join('\n')
}

function buildAssistantSummary(message: AgentConversationMessage) {
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

function buildAssistantMeta(
  message: AgentConversationMessage,
  prompt: string | undefined,
): MessageMeta | undefined {
  const meta: MessageMeta = {
    status: message.status,
    provider: message.provider,
    model: message.model,
    reasoning: buildAssistantReasoning(message),
    prompt,
    summary: buildAssistantSummary(message),
  }

  return Object.values(meta).some((value) => Boolean(value)) ? meta : undefined
}

function getMessageContent(message: AgentConversationMessage) {
  const trimmedContent = message.content.trim()

  if (trimmedContent) {
    return trimmedContent
  }

  return message.content
}

export function mapConversationMessageToChatMessageView(
  message: AgentConversationMessage,
  prompt: string | undefined,
  fallbackIndex = 0,
): ChatMessageView {
  if (message.role === 'user') {
    return {
      id: message.id,
      type: 'chat',
      role: 'user',
      content: getMessageContent(message),
      sortKey: createConversationMessageSortKey(message.created_at, fallbackIndex),
    }
  }

  return {
    id: message.id,
    type: 'chat',
    role: 'assistant',
    content: getMessageContent(message),
    meta: buildAssistantMeta(message, prompt),
    sortKey: createConversationMessageSortKey(message.created_at, fallbackIndex),
  }
}

export function mapConversationMessagesToChatMessageViews(
  messages: AgentConversationMessage[],
): ChatMessageView[] {
  const assistantPrompts = new Map<string, string | undefined>()
  let lastUserPrompt: string | undefined

  for (const message of [...messages].reverse()) {
    if (message.role === 'user') {
      lastUserPrompt = getMessageContent(message) || undefined
      continue
    }

    assistantPrompts.set(message.id, lastUserPrompt)
  }

  return messages.map((message, index) =>
    mapConversationMessageToChatMessageView(
      message,
      message.role === 'assistant' ? assistantPrompts.get(message.id) : undefined,
      messages.length - index,
    ),
  )
}
