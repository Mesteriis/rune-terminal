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
  status: 'complete' | 'error'
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
  attachments?: AgentAttachmentReference[]
  context: AgentConversationContext
}) {
  return postRuntimeJSON<AgentConversationResponse>('/api/v1/agent/conversation/messages', {
    attachments: input.attachments,
    context: input.context,
    prompt: input.prompt,
  })
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
