import type {
  AgentConversationMessage,
  AgentConversationProvider,
  AgentConversationSnapshot,
  AgentConversationStreamEvent,
} from '@/features/agent/api/client'
import { mapConversationMessagesToChatMessageViews } from '@/features/agent/model/chat-message-view'
import type { AiPanelWidgetState, ChatMessageView, MessageMeta } from '@/features/agent/model/types'

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

function createStatusMessage(input: { id: string; content: string; meta?: MessageMeta }): ChatMessageView {
  return {
    id: input.id,
    type: 'chat',
    role: 'assistant',
    content: input.content,
    meta: input.meta,
    sortKey: 0,
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

function appendConversationReasoning(message: AgentConversationMessage, delta: string) {
  const trimmedDelta = delta.trim()
  if (!trimmedDelta) {
    return message
  }

  const currentReasoning = message.reasoning?.trim() ?? ''
  const reasoning = currentReasoning ? `${currentReasoning}\n\n${trimmedDelta}` : trimmedDelta

  return {
    ...message,
    reasoning,
    status: 'streaming' as const,
  }
}

function formatToolCallReasoningLine(
  event: Extract<AgentConversationStreamEvent, { type: 'tool-call' }>,
): string {
  const toolCall = event.tool_call
  const status = toolCall.status?.trim() || 'updated'
  const name = toolCall.summary?.trim() || toolCall.name?.trim() || toolCall.kind?.trim() || 'tool'
  const details: string[] = [`Tool ${status}: ${name}`]

  if (toolCall.output?.trim()) {
    details.push(`Output: ${toolCall.output.trim()}`)
  } else if (toolCall.input?.trim()) {
    details.push(`Input: ${toolCall.input.trim()}`)
  }

  if (Number.isFinite(toolCall.exit_code)) {
    details.push(`Exit code: ${toolCall.exit_code}`)
  }

  return details.join('\n')
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
    case 'reasoning-delta':
      return updateConversationMessage(messages, event.message_id, (message) =>
        appendConversationReasoning(message, event.delta),
      )
    case 'tool-call':
      return updateConversationMessage(messages, event.message_id, (message) =>
        appendConversationReasoning(message, formatToolCallReasoningLine(event)),
      )
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
    meta?: MessageMeta
  },
) {
  return {
    ...panelState,
    messages: [...panelState.messages, createStatusMessage(input)],
  }
}
