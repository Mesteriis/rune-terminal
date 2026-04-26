import { AgentAPIError } from '@/features/agent/api/client'
import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type AgentProviderKind = 'codex' | 'claude' | 'openai-compatible'

export type AgentCodexProviderSettingsView = {
  command?: string
  model: string
  chat_models?: string[]
  status_state: 'auth-required' | 'ready' | 'missing'
  status_message?: string
  resolved_binary?: string
}

export type AgentClaudeProviderSettingsView = {
  command?: string
  model: string
  chat_models?: string[]
  status_state: 'auth-required' | 'ready' | 'missing'
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
  openai_compatible?: {
    base_url: string
    model: string
    chat_models?: string[]
  }
  created_at: string
  updated_at: string
}

export type AgentProviderCatalog = {
  providers: AgentProviderView[]
  active_provider_id: string
  supported_kinds: AgentProviderKind[]
}

export type AgentProviderGatewayProvider = {
  provider_id: string
  provider_kind: AgentProviderKind | string
  display_name: string
  enabled: boolean
  active: boolean
  total_runs: number
  succeeded_runs: number
  failed_runs: number
  cancelled_runs: number
  average_duration_ms: number
  last_duration_ms: number
  last_status?: 'succeeded' | 'failed' | 'cancelled' | string
  last_error_code?: string
  last_error_message?: string
  last_started_at?: string
  last_completed_at?: string
}

export type AgentProviderGatewayRun = {
  id: string
  provider_id: string
  provider_kind: AgentProviderKind | string
  provider_display_name: string
  request_mode: 'sync' | 'stream' | string
  model?: string
  conversation_id?: string
  status: 'succeeded' | 'failed' | 'cancelled' | string
  error_code?: string
  error_message?: string
  duration_ms: number
  started_at: string
  completed_at: string
}

export type AgentProviderGatewaySnapshot = {
  generated_at: string
  providers: AgentProviderGatewayProvider[]
  recent_runs: AgentProviderGatewayRun[]
}

export type AgentProviderProbeResult = {
  provider_id: string
  provider_kind: AgentProviderKind | string
  display_name: string
  ready: boolean
  status_state: string
  status_message: string
  resolved_binary?: string
  base_url?: string
  model?: string
  discovered_models?: string[]
  latency_ms: number
  checked_at: string
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
  openai_compatible?: {
    base_url?: string
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
  openai_compatible?: {
    base_url?: string
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
  openai_compatible?: {
    base_url?: string
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

function normalizeChatModels(models: unknown) {
  return Array.isArray(models) ? models.filter((model): model is string => typeof model === 'string') : []
}

function normalizeProviderView(provider: AgentProviderView): AgentProviderView {
  if (provider.kind === 'codex') {
    return {
      ...provider,
      codex: provider.codex
        ? {
            ...provider.codex,
            chat_models: normalizeChatModels(provider.codex.chat_models),
          }
        : provider.codex,
    }
  }

  if (provider.kind === 'claude') {
    return {
      ...provider,
      claude: provider.claude
        ? {
            ...provider.claude,
            chat_models: normalizeChatModels(provider.claude.chat_models),
          }
        : provider.claude,
    }
  }

  if (provider.kind === 'openai-compatible') {
    return {
      ...provider,
      openai_compatible: provider.openai_compatible
        ? {
            ...provider.openai_compatible,
            chat_models: normalizeChatModels(provider.openai_compatible.chat_models),
          }
        : provider.openai_compatible,
    }
  }

  return provider
}

function normalizeProviderCatalog(catalog: AgentProviderCatalog): AgentProviderCatalog {
  return {
    ...catalog,
    providers: Array.isArray(catalog.providers) ? catalog.providers.map(normalizeProviderView) : [],
    supported_kinds: Array.isArray(catalog.supported_kinds)
      ? catalog.supported_kinds.filter(
          (kind): kind is AgentProviderKind =>
            kind === 'codex' || kind === 'claude' || kind === 'openai-compatible',
        )
      : [],
  }
}

function normalizeProviderGatewaySnapshot(
  snapshot: AgentProviderGatewaySnapshot,
): AgentProviderGatewaySnapshot {
  return {
    generated_at: snapshot.generated_at,
    providers: Array.isArray(snapshot.providers) ? snapshot.providers : [],
    recent_runs: Array.isArray(snapshot.recent_runs) ? snapshot.recent_runs : [],
  }
}

function normalizeProviderMutationResponse(response: ProviderMutationResponse): ProviderMutationResponse {
  return {
    ...response,
    provider: normalizeProviderView(response.provider),
    providers: normalizeProviderCatalog(response.providers),
  }
}

function normalizeModelCatalog(catalog: AgentProviderModelCatalog): AgentProviderModelCatalog {
  return {
    models: normalizeChatModels(catalog.models),
  }
}

export async function fetchAgentProviderCatalog() {
  return normalizeProviderCatalog(
    await requestProviderRuntimeJSON<AgentProviderCatalog>('/api/v1/agent/providers'),
  )
}

export async function fetchAgentProviderGatewaySnapshot() {
  return normalizeProviderGatewaySnapshot(
    await requestProviderRuntimeJSON<AgentProviderGatewaySnapshot>('/api/v1/agent/providers/gateway'),
  )
}

export async function probeAgentProvider(providerID: string) {
  return await requestProviderRuntimeJSON<AgentProviderProbeResult>(
    `/api/v1/agent/providers/${encodeURIComponent(providerID)}/probe`,
    {
      method: 'POST',
    },
  )
}

export async function createAgentProvider(payload: CreateAgentProviderPayload) {
  return normalizeProviderMutationResponse(
    await requestProviderRuntimeJSON<ProviderMutationResponse>('/api/v1/agent/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}

export async function discoverAgentProviderModels(payload: DiscoverAgentProviderModelsPayload) {
  return normalizeModelCatalog(
    await requestProviderRuntimeJSON<AgentProviderModelCatalog>('/api/v1/agent/providers/models', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  )
}

export async function updateAgentProvider(providerID: string, payload: UpdateAgentProviderPayload) {
  return normalizeProviderMutationResponse(
    await requestProviderRuntimeJSON<ProviderMutationResponse>(`/api/v1/agent/providers/${providerID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  )
}

export async function setActiveAgentProvider(providerID: string) {
  return normalizeProviderCatalog(
    await requestProviderRuntimeJSON<AgentProviderCatalog>('/api/v1/agent/providers/active', {
      method: 'PUT',
      body: JSON.stringify({ id: providerID }),
    }),
  )
}

export async function deleteAgentProvider(providerID: string) {
  return normalizeProviderCatalog(
    await requestProviderRuntimeJSON<AgentProviderCatalog>(`/api/v1/agent/providers/${providerID}`, {
      method: 'DELETE',
    }),
  )
}
