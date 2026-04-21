import type { AgentConversationMessage, AgentConversationSnapshot } from '@/features/agent/api/client'
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
  if (snapshot.messages.length === 0) {
    const providerLabel = snapshot.provider.model
      ? `${snapshot.provider.kind} · ${snapshot.provider.model}`
      : snapshot.provider.kind

    return createPanelState([
      createStatusPrompt({
        id: 'agent-empty',
        title: 'Conversation',
        preview: 'Backend conversation is empty.',
        reasoning: [
          `Provider: ${providerLabel}`,
          `Streaming: ${snapshot.provider.streaming ? 'enabled' : 'disabled'}`,
        ],
        summary: 'Waiting for the first backend message.',
      }),
    ])
  }

  return createPanelState(snapshot.messages.map(mapConversationMessage))
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
