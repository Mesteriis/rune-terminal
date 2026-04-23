import { AgentAPIError } from '@/features/agent/api/client'
import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type AgentProviderKind = 'codex' | 'claude'

export type AgentCodexProviderSettingsView = {
  command?: string
  model: string
  chat_models?: string[]
  status_state: 'ready' | 'missing'
  status_message?: string
  resolved_binary?: string
}

export type AgentClaudeProviderSettingsView = {
  command?: string
  model: string
  chat_models?: string[]
  status_state: 'ready' | 'missing'
  status_message?: string
  resolved_binary?: string
}

export type AgentProviderView = {
  id: string
  kind: AgentProviderKind
  display_name: string
  enabled: boolean
  active: boolean
  codex?: AgentCodexProviderSettingsView
  claude?: AgentClaudeProviderSettingsView
  created_at: string
  updated_at: string
}

export type AgentProviderCatalog = {
  providers: AgentProviderView[]
  active_provider_id: string
  supported_kinds: AgentProviderKind[]
}

export type AgentProviderModelCatalog = {
  models: string[]
}

export type DiscoverAgentProviderModelsPayload = {
  provider_id?: string
  kind?: AgentProviderKind
  codex?: {
    command?: string
    model?: string
  }
  claude?: {
    command?: string
    model?: string
  }
}

export type CreateAgentProviderPayload = {
  kind: AgentProviderKind
  display_name: string
  enabled?: boolean
  codex?: {
    command?: string
    model?: string
    chat_models?: string[]
  }
  claude?: {
    command?: string
    model?: string
    chat_models?: string[]
  }
}

export type UpdateAgentProviderPayload = {
  display_name?: string
  enabled?: boolean
  codex?: {
    command?: string
    model?: string
    chat_models?: string[]
  }
  claude?: {
    command?: string
    model?: string
    chat_models?: string[]
  }
}

type ProviderMutationResponse = {
  provider: AgentProviderView
  providers: AgentProviderCatalog
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

async function fetchProviderRuntimeJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
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
      errorPayload?.error?.code ?? 'agent_provider_request_failed',
      errorPayload?.error?.message ?? `Agent provider request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

async function requestProviderRuntimeJSON<T>(path: string, init?: RequestInit) {
  const runtimeContext = await resolveRuntimeContext()
  return fetchProviderRuntimeJSON<T>(runtimeContext, path, init)
}

export async function fetchAgentProviderCatalog() {
  return requestProviderRuntimeJSON<AgentProviderCatalog>('/api/v1/agent/providers')
}

export async function createAgentProvider(payload: CreateAgentProviderPayload) {
  return requestProviderRuntimeJSON<ProviderMutationResponse>('/api/v1/agent/providers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function discoverAgentProviderModels(payload: DiscoverAgentProviderModelsPayload) {
  return requestProviderRuntimeJSON<AgentProviderModelCatalog>('/api/v1/agent/providers/models', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAgentProvider(providerID: string, payload: UpdateAgentProviderPayload) {
  return requestProviderRuntimeJSON<ProviderMutationResponse>(`/api/v1/agent/providers/${providerID}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function setActiveAgentProvider(providerID: string) {
  return requestProviderRuntimeJSON<AgentProviderCatalog>('/api/v1/agent/providers/active', {
    method: 'PUT',
    body: JSON.stringify({ id: providerID }),
  })
}

export async function deleteAgentProvider(providerID: string) {
  return requestProviderRuntimeJSON<AgentProviderCatalog>(`/api/v1/agent/providers/${providerID}`, {
    method: 'DELETE',
  })
}
