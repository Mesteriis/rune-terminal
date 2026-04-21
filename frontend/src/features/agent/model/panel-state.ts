import type {
  AgentConversationMessage,
  AgentConversationProvider,
  AgentConversationSnapshot,
  AgentConversationStreamEvent,
} from '@/features/agent/api/client'
import { mapConversationMessagesToChatMessageViews } from '@/features/agent/model/chat-message-view'
import type { AiPanelWidgetState, ChatMessageView } from '@/features/agent/model/types'

const AI_PANEL_TITLE = 'AI RUNE'
const AI_TOOLBAR_LABEL = 'TOOL BAR'
const AI_ACTIVE_TOOL = 'Chat'
const AI_COMPOSER_PLACEHOLDER = 'Text Area'

function createPanelState(messages: ChatMessageView[]): AiPanelWidgetState {
  return {
    title: AI_PANEL_TITLE,
    toolbarLabel: AI_TOOLBAR_LABEL,
    activeTool: AI_ACTIVE_TOOL,
    messages,
    composerPlaceholder: AI_COMPOSER_PLACEHOLDER,
  }
}

function createStatusMessage(input: {
  id: string
  content: string
  meta?: ChatMessageView['meta']
}): ChatMessageView {
  return {
    id: input.id,
    role: 'assistant',
    content: input.content,
    meta: input.meta,
  }
}

export function createAgentPanelLoadingState() {
  return createPanelState([
    createStatusMessage({
      id: 'agent-loading',
      content: 'Loading backend conversation.',
      meta: {
        reasoning: 'Route: GET /api/v1/agent/conversation',
        summary: 'Loading',
      },
    }),
  ])
}

export function createAgentPanelErrorState(message: string) {
  return createPanelState([
    createStatusMessage({
      id: 'agent-error',
      content: message,
      meta: {
        reasoning: 'Route: GET /api/v1/agent/conversation',
        summary: 'Backend error',
      },
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
      createStatusMessage({
        id: 'agent-empty',
        content: 'Backend conversation is empty.',
        meta: {
          reasoning: [
            `Provider: ${providerLabel}`,
            `Streaming: ${provider?.streaming ? 'enabled' : 'disabled'}`,
          ].join('\n'),
          summary: 'Waiting for the first backend message.',
        },
      }),
    ])
  }

  return createPanelState(mapConversationMessagesToChatMessageViews(messages))
}

function upsertConversationMessage(
  messages: AgentConversationMessage[],
  message: AgentConversationMessage,
): AgentConversationMessage[] {
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
): AgentConversationMessage[] {
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
): AgentConversationMessage[] {
  return [...messages, message]
}

export function removeAgentConversationMessage(
  messages: AgentConversationMessage[],
  messageID: string,
): AgentConversationMessage[] {
  return messages.filter((message) => message.id !== messageID)
}

export function finalizeAgentConversationStreamingMessages(
  messages: AgentConversationMessage[],
  errorMessage: string,
): AgentConversationMessage[] {
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
): AgentConversationMessage[] {
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

export function appendAgentPanelStatusMessage(
  panelState: AiPanelWidgetState,
  input: {
    id: string
    content: string
    meta?: ChatMessageView['meta']
  },
) {
  return {
    ...panelState,
    messages: [...panelState.messages, createStatusMessage(input)],
  }
}
