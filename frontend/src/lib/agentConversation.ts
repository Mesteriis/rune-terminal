import type { AgentConversationMessage, AgentConversationSnapshot, AgentFeedEntry } from '../types'

export function normalizeConversationSnapshot(snapshot: AgentConversationSnapshot | null | undefined): AgentConversationSnapshot {
  const messages = Array.isArray(snapshot?.messages)
    ? snapshot.messages.map(normalizeConversationMessage)
    : []

  return {
    messages,
    provider: {
      kind: snapshot?.provider?.kind ?? 'ollama',
      base_url: snapshot?.provider?.base_url ?? 'http://192.168.1.2:11434',
      model: snapshot?.provider?.model,
      streaming: snapshot?.provider?.streaming ?? false,
    },
    updated_at: snapshot?.updated_at ?? new Date(0).toISOString(),
  }
}

export function mapConversationToFeedEntries(messages: AgentConversationMessage[]): AgentFeedEntry[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    kind: 'message',
    body: message.content,
    tone: message.status === 'error' ? 'error' : undefined,
    tags: [message.provider, message.model].filter(Boolean) as string[],
    provider: message.provider,
    model: message.model,
    timestamp: message.created_at,
  }))
}

function normalizeConversationMessage(message: AgentConversationMessage | null | undefined): AgentConversationMessage {
  return {
    id: message?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    content: message?.content ?? '',
    status: message?.status === 'error' ? 'error' : 'complete',
    provider: message?.provider,
    model: message?.model,
    created_at: message?.created_at ?? new Date().toISOString(),
  }
}
