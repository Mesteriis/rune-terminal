import { AgentAPIError } from '@/features/agent/api/client'
import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type AgentProviderKind = 'ollama' | 'codex' | 'openai' | 'proxy'
export type AgentProxyServiceType = 'openai' | 'claude' | 'gemini'
export type AgentProxyAuthType = '' | 'bearer' | 'x-api-key' | 'both' | 'x-goog-api-key'
export type AgentProxyChannelStatus = 'active' | 'suspended' | 'disabled'

export type AgentOllamaProviderSettings = {
  base_url: string
  model?: string
  chat_models?: string[]
}

export type AgentOpenAIProviderSettingsView = {
  base_url: string
  model: string
  chat_models?: string[]
  has_api_key: boolean
}

export type AgentCodexProviderSettingsView = {
  model: string
  chat_models?: string[]
  auth_file_path?: string
  auth_mode?: string
  auth_state: 'ready' | 'missing' | 'invalid'
  status_message?: string
  last_refresh?: string
  account_id?: string
}

export type AgentProxyChannelSettingsView = {
  id: string
  name: string
  service_type: AgentProxyServiceType
  base_url?: string
  base_urls?: string[]
  auth_type?: AgentProxyAuthType
  priority?: number
  status?: AgentProxyChannelStatus
  model_mapping?: Record<string, string>
  description?: string
  insecure_skip_verify?: boolean
  key_count: number
  enabled_key_count: number
}

export type AgentProxyProviderSettingsView = {
  model: string
  channels: AgentProxyChannelSettingsView[]
}

export type AgentProviderView = {
  id: string
  kind: AgentProviderKind
  display_name: string
  enabled: boolean
  active: boolean
  ollama?: AgentOllamaProviderSettings
  codex?: AgentCodexProviderSettingsView
  openai?: AgentOpenAIProviderSettingsView
  proxy?: AgentProxyProviderSettingsView
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
  ollama?: {
    base_url?: string
  }
  codex?: {
    auth_file_path?: string
  }
  openai?: {
    base_url?: string
    api_key?: string
  }
}

export type CreateAgentProviderPayload = {
  kind: AgentProviderKind
  display_name: string
  enabled?: boolean
  ollama?: {
    base_url: string
    model?: string
    chat_models?: string[]
  }
  codex?: {
    model?: string
    chat_models?: string[]
    auth_file_path?: string
  }
  openai?: {
    base_url?: string
    model?: string
    chat_models?: string[]
    api_key: string
  }
  proxy?: {
    model: string
    channels: Array<{
      id?: string
      name: string
      service_type: AgentProxyServiceType
      base_url?: string
      base_urls?: string[]
      api_keys?: Array<{
        key: string
        enabled: boolean
      }>
      auth_type?: Exclude<AgentProxyAuthType, ''>
      priority?: number
      status?: AgentProxyChannelStatus
      model_mapping?: Record<string, string>
      description?: string
      insecure_skip_verify?: boolean
    }>
  }
}

export type UpdateAgentProviderPayload = {
  display_name?: string
  enabled?: boolean
  ollama?: {
    base_url?: string
    model?: string
    chat_models?: string[]
  }
  codex?: {
    model?: string
    chat_models?: string[]
    auth_file_path?: string
  }
  openai?: {
    base_url?: string
    model?: string
    chat_models?: string[]
    api_key?: string
  }
  proxy?: {
    model?: string
    channels?: Array<{
      id?: string
      name: string
      service_type: AgentProxyServiceType
      base_url?: string
      base_urls?: string[]
      api_keys?: Array<{
        key: string
        enabled: boolean
      }>
      auth_type?: Exclude<AgentProxyAuthType, ''>
      priority?: number
      status?: AgentProxyChannelStatus
      model_mapping?: Record<string, string>
      description?: string
      insecure_skip_verify?: boolean
    }>
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
