import type { AgentConversationMessage } from '@/features/agent/api/client'
import type { ChatMessageView } from '@/features/agent/model/types'

export function createOptimisticUserConversationMessage(
  hostId: string,
  sequence: number,
  prompt: string,
  attachments: AgentConversationMessage['attachments'] = [],
): AgentConversationMessage {
  return {
    id: `agent-local-user-${hostId}-${sequence}`,
    role: 'user',
    content: prompt,
    attachments,
    status: 'complete',
    created_at: new Date().toISOString(),
  }
}

export function sortMessagesBySortKey(messages: ChatMessageView[]) {
  return [...messages].sort((left, right) => (left.sortKey ?? 0) - (right.sortKey ?? 0))
}

export function upsertInteractionMessage(currentMessages: ChatMessageView[], nextMessage: ChatMessageView) {
  const messageIndex = currentMessages.findIndex((message) => message.id === nextMessage.id)

  if (messageIndex < 0) {
    return sortMessagesBySortKey([...currentMessages, nextMessage])
  }

  const nextMessages = [...currentMessages]
  nextMessages[messageIndex] = nextMessage
  return sortMessagesBySortKey(nextMessages)
}

export function updateInteractionMessage(
  currentMessages: ChatMessageView[],
  messageID: string,
  update: (message: ChatMessageView) => ChatMessageView,
) {
  const messageIndex = currentMessages.findIndex((message) => message.id === messageID)

  if (messageIndex < 0) {
    return currentMessages
  }

  const nextMessages = [...currentMessages]
  nextMessages[messageIndex] = update(nextMessages[messageIndex])
  return sortMessagesBySortKey(nextMessages)
}
