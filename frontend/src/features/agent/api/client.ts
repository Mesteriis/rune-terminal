import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type AgentPolicyOverlay = {
  capability_additions?: string[]
  capability_removals?: string[]
  minimum_mutation_tier?: string
  escalate_approval_by?: number
  disable_trusted_auto_approve?: boolean
  security_posture?: string
}

export type AgentPromptProfile = {
  id: string
  name: string
  description: string
  system_prompt: string
  overlay: AgentPolicyOverlay
}

export type AgentRolePreset = {
  id: string
  name: string
  description: string
  prompt: string
  overlay: AgentPolicyOverlay
}

export type AgentWorkMode = {
  id: string
  name: string
  description: string
  prompt: string
  overlay: AgentPolicyOverlay
}

export type AgentEvaluationProfile = {
  prompt_profile_id?: string
  role_id?: string
  mode_id?: string
  security_posture?: string
  capability_overlay?: {
    additions?: string[]
    removals?: string[]
  }
  approval_overlay?: {
    escalate_by?: number
    minimum_mutation_tier?: string
  }
  disable_trusted_auto_approve?: boolean
}

export type AgentSelectionView = {
  profile: AgentPromptProfile
  role: AgentRolePreset
  mode: AgentWorkMode
  effective_prompt: string
  effective_policy_profile: AgentEvaluationProfile
}

export type AgentCatalog = {
  profiles: AgentPromptProfile[]
  roles: AgentRolePreset[]
  modes: AgentWorkMode[]
  active: AgentSelectionView
}

export type AgentAttachmentReference = {
  id: string
  name: string
  path: string
  mime_type: string
  size: number
  modified_time: number
}

export type AgentConversationMessage = {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  attachments?: AgentAttachmentReference[]
  status: 'streaming' | 'complete' | 'error'
  provider?: string
  model?: string
  created_at: string
}

export type AgentConversationProvider = {
  kind: string
  base_url: string
  model?: string
  streaming: boolean
}

export type AgentConversationSnapshot = {
  messages: AgentConversationMessage[]
  provider: AgentConversationProvider
  updated_at: string
}

export type AgentConversationContext = {
  workspace_id?: string
  repo_root?: string
  active_widget_id?: string
  action_source?: string
  target_session?: string
  target_connection_id?: string
  widget_context_enabled?: boolean
}

export type AgentConversationStreamEventType = 'message-start' | 'text-delta' | 'message-complete' | 'error'

export type AgentConversationMessageStartEvent = {
  type: 'message-start'
  message_id: string
  message: AgentConversationMessage
}

export type AgentConversationTextDeltaEvent = {
  type: 'text-delta'
  message_id: string
  delta: string
}

export type AgentConversationMessageCompleteEvent = {
  type: 'message-complete'
  message_id: string
  message: AgentConversationMessage
}

export type AgentConversationErrorEvent = {
  type: 'error'
  message_id?: string
  message?: AgentConversationMessage
  error?: string
}

export type AgentConversationStreamEvent =
  | AgentConversationMessageStartEvent
  | AgentConversationTextDeltaEvent
  | AgentConversationMessageCompleteEvent
  | AgentConversationErrorEvent

export type AgentConversationStreamConnection = {
  close: () => void
  done: Promise<void>
}

type AgentConversationResponse = {
  conversation: AgentConversationSnapshot
  provider_error: string
}

type AgentAttachmentReferenceResponse = {
  attachment: AgentAttachmentReference
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

type AgentConversationStreamOptions = {
  onError?: (error: unknown) => void
  onEvent: (event: AgentConversationStreamEvent) => void
  signal?: AbortSignal
}

export class AgentAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AgentAPIError'
    this.status = status
    this.code = code
  }
}

async function fetchRuntimeJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
  const response = await fetch(`${runtimeContext.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : null),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let errorPayload: APIErrorEnvelope | null = null

    try {
      errorPayload = (await response.json()) as APIErrorEnvelope
    } catch {
      errorPayload = null
    }

    throw new AgentAPIError(
      response.status,
      errorPayload?.error?.code ?? 'agent_request_failed',
      errorPayload?.error?.message ?? `Agent request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

async function requestRuntimeJSON<T>(path: string, init?: RequestInit) {
  const runtimeContext = await resolveRuntimeContext()
  return fetchRuntimeJSON<T>(runtimeContext, path, init)
}

function parseEventBlock(block: string) {
  const dataLines: string[] = []
  let eventName = 'message'

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') {
      eventName = value
      continue
    }

    if (field === 'data') {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  return {
    data: dataLines.join('\n'),
    event: eventName,
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function attachAbortSignal(signal: AbortSignal | undefined, controller: AbortController) {
  if (!signal) {
    return () => {}
  }

  if (signal.aborted) {
    controller.abort(signal.reason)
    return () => {}
  }

  const abortListener = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abortListener, { once: true })

  return () => {
    signal.removeEventListener('abort', abortListener)
  }
}

function isSupportedAgentConversationStreamEventType(
  value: string,
): value is AgentConversationStreamEventType {
  return (
    value === 'message-start' || value === 'text-delta' || value === 'message-complete' || value === 'error'
  )
}

async function consumeAgentConversationStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AgentConversationStreamEvent) => void,
) {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffer = ''

  const flushBuffer = (flushRemainder = false) => {
    let normalizedBuffer = buffer.replace(/\r\n?/g, '\n')
    let boundaryIndex = normalizedBuffer.indexOf('\n\n')

    while (boundaryIndex >= 0) {
      const eventBlock = normalizedBuffer.slice(0, boundaryIndex)
      normalizedBuffer = normalizedBuffer.slice(boundaryIndex + 2)
      const parsedEvent = parseEventBlock(eventBlock)

      if (parsedEvent) {
        if (!isSupportedAgentConversationStreamEventType(parsedEvent.event)) {
          throw new Error(`Unsupported agent stream event type: ${parsedEvent.event}`)
        }

        const payload = JSON.parse(parsedEvent.data) as AgentConversationStreamEvent

        if (payload.type !== parsedEvent.event) {
          throw new Error(
            `Agent stream event type mismatch: received ${parsedEvent.event} with payload ${payload.type}`,
          )
        }

        onEvent(payload)
      }

      boundaryIndex = normalizedBuffer.indexOf('\n\n')
    }

    buffer = flushRemainder ? '' : normalizedBuffer

    if (flushRemainder && normalizedBuffer.trim() !== '') {
      const parsedEvent = parseEventBlock(normalizedBuffer)

      if (parsedEvent) {
        if (!isSupportedAgentConversationStreamEventType(parsedEvent.event)) {
          throw new Error(`Unsupported agent stream event type: ${parsedEvent.event}`)
        }

        const payload = JSON.parse(parsedEvent.data) as AgentConversationStreamEvent

        if (payload.type !== parsedEvent.event) {
          throw new Error(
            `Agent stream event type mismatch: received ${parsedEvent.event} with payload ${payload.type}`,
          )
        }

        onEvent(payload)
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    flushBuffer(done)

    if (done) {
      return
    }
  }
}

async function postRuntimeJSON<T>(path: string, body: Record<string, unknown>) {
  return requestRuntimeJSON<T>(path, {
    body: JSON.stringify(body),
    method: 'POST',
  })
}

async function putRuntimeJSON<T>(path: string, body: Record<string, unknown>) {
  return requestRuntimeJSON<T>(path, {
    body: JSON.stringify(body),
    method: 'PUT',
  })
}

export async function fetchAgentCatalog() {
  return requestRuntimeJSON<AgentCatalog>('/api/v1/agent')
}

export async function fetchAgentConversation() {
  const payload = await requestRuntimeJSON<{ conversation: AgentConversationSnapshot }>(
    '/api/v1/agent/conversation',
  )
  return payload.conversation
}

export async function sendAgentConversationMessage(input: {
  prompt: string
  model?: string
  attachments?: AgentAttachmentReference[]
  context: AgentConversationContext
}) {
  return postRuntimeJSON<AgentConversationResponse>('/api/v1/agent/conversation/messages', {
    attachments: input.attachments,
    context: input.context,
    model: input.model,
    prompt: input.prompt,
  })
}

export async function streamAgentConversationMessage(
  input: {
    prompt: string
    model?: string
    attachments?: AgentAttachmentReference[]
    context: AgentConversationContext
  },
  { onError, onEvent, signal }: AgentConversationStreamOptions,
): Promise<AgentConversationStreamConnection> {
  const runtimeContext = await resolveRuntimeContext()
  const streamAbortController = new AbortController()
  const detachAbortSignal = attachAbortSignal(signal, streamAbortController)

  const done = (async () => {
    try {
      const response = await fetch(`${runtimeContext.baseUrl}/api/v1/agent/conversation/messages/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${runtimeContext.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input.prompt,
          model: input.model,
          attachments: input.attachments,
          context: input.context,
        }),
        signal: streamAbortController.signal,
      })

      if (!response.ok) {
        let errorPayload: APIErrorEnvelope | null = null

        try {
          errorPayload = (await response.json()) as APIErrorEnvelope
        } catch {
          errorPayload = null
        }

        throw new AgentAPIError(
          response.status,
          errorPayload?.error?.code ?? 'agent_stream_failed',
          errorPayload?.error?.message ?? `Agent stream failed (${response.status})`,
        )
      }

      if (!response.body) {
        throw new Error('Agent stream response did not provide a readable body')
      }

      await consumeAgentConversationStream(response.body, onEvent)
    } catch (error) {
      if (!isAbortError(error)) {
        onError?.(error)
        throw error
      }
    } finally {
      detachAbortSignal()
    }
  })()

  return {
    close: () => streamAbortController.abort(),
    done,
  }
}

export async function createAgentAttachmentReference(input: {
  path: string
  workspace_id?: string
  action_source?: string
}) {
  const payload = await postRuntimeJSON<AgentAttachmentReferenceResponse>(
    '/api/v1/agent/conversation/attachments/references',
    input,
  )
  return payload.attachment
}

export async function setAgentProfile(id: string) {
  return putRuntimeJSON<AgentCatalog>('/api/v1/agent/selection/profile', { id })
}

export async function setAgentRole(id: string) {
  return putRuntimeJSON<AgentCatalog>('/api/v1/agent/selection/role', { id })
}

export async function setAgentMode(id: string) {
  return putRuntimeJSON<AgentCatalog>('/api/v1/agent/selection/mode', { id })
}
