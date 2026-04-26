import { AgentAPIError } from '@/features/agent/api/client'
import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type AgentProviderKind = 'codex' | 'claude' | 'openai-compatible'
export type AgentProviderPrewarmPolicy = 'manual' | 'on_activate' | 'on_startup'

export type AgentProviderActor = {
  username: string
  home_dir?: string
}

export type AgentProviderAccessPolicy = {
  owner_username: string
  visibility?: string
  allowed_users?: string[]
}

export type AgentProviderRoutePolicy = {
  prewarm_policy?: AgentProviderPrewarmPolicy
  warm_ttl_seconds?: number
}

export type AgentCodexProviderSettingsView = {
  command?: string
  model: string
  chat_models?: string[]
}

export type AgentClaudeProviderSettingsView = {
  command?: string
  model: string
  chat_models?: string[]
}

export type AgentProviderView = {
  id: string
  kind: AgentProviderKind
  display_name: string
  enabled: boolean
  active: boolean
  access: AgentProviderAccessPolicy
  created_by: AgentProviderActor
  updated_by: AgentProviderActor
  route_policy: AgentProviderRoutePolicy
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
  current_actor: AgentProviderActor
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
  route_ready: boolean
  route_status_state?: string
  route_status_message?: string
  resolved_binary?: string
  base_url?: string
  model?: string
  route_checked_at?: string
  route_latency_ms: number
  route_prepared: boolean
  route_prepare_state?: string
  route_prepare_message?: string
  route_prepared_at?: string
  route_prepare_latency_ms: number
  route_prepare_expires_at?: string
  route_prepare_stale: boolean
  route_prewarm_policy?: string
  route_warm_ttl_seconds: number
  total_runs: number
  succeeded_runs: number
  failed_runs: number
  cancelled_runs: number
  average_duration_ms: number
  average_first_response_latency_ms: number
  last_duration_ms: number
  last_first_response_latency_ms: number
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
  actor_username?: string
  actor_home_dir?: string
  request_mode: 'sync' | 'stream' | string
  model?: string
  conversation_id?: string
  status: 'succeeded' | 'failed' | 'cancelled' | string
  error_code?: string
  error_message?: string
  route_ready: boolean
  route_status_state?: string
  route_status_message?: string
  route_prepared: boolean
  route_prepare_state?: string
  route_prepare_message?: string
  resolved_binary?: string
  base_url?: string
  duration_ms: number
  first_response_latency_ms: number
  started_at: string
  completed_at: string
}

export type AgentProviderGatewaySnapshot = {
  generated_at: string
  providers: AgentProviderGatewayProvider[]
  recent_runs: AgentProviderGatewayRun[]
  recent_runs_total: number
  recent_runs_offset: number
  recent_runs_limit: number
  recent_runs_has_more: boolean
}

export type AgentProviderGatewaySnapshotQuery = {
  providerID?: string
  status?: 'failed' | 'succeeded' | 'cancelled'
  query?: string
  offset?: number
  limit?: number
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

export type AgentProviderPrewarmResult = {
  provider_id: string
  provider_kind: AgentProviderKind | string
  display_name: string
  prepared: boolean
  prepare_state: string
  prepare_message: string
  resolved_binary?: string
  base_url?: string
  model?: string
  latency_ms: number
  prepared_at: string
  route_ready: boolean
  route_status_state: string
  route_status_message: string
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
  access?: {
    owner_username?: string
    visibility?: string
    allowed_users?: string[]
  }
  route_policy?: AgentProviderRoutePolicy
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
  access?: {
    owner_username?: string
    visibility?: string
    allowed_users?: string[]
  }
  route_policy?: AgentProviderRoutePolicy
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

function normalizeActor(actor: AgentProviderActor | undefined): AgentProviderActor {
  return {
    username: actor?.username?.trim() || 'unknown',
    home_dir: actor?.home_dir?.trim() || undefined,
  }
}

function normalizeAccessPolicy(
  access: AgentProviderAccessPolicy | undefined,
  owner: AgentProviderActor,
): AgentProviderAccessPolicy {
  return {
    owner_username: access?.owner_username?.trim() || owner.username,
    visibility: access?.visibility?.trim() || undefined,
    allowed_users: Array.isArray(access?.allowed_users)
      ? access.allowed_users.map((entry) => entry.trim()).filter(Boolean)
      : [],
  }
}

function normalizeRoutePolicy(policy: AgentProviderRoutePolicy | undefined): AgentProviderRoutePolicy {
  const prewarmPolicy = policy?.prewarm_policy?.trim()
  return {
    prewarm_policy:
      prewarmPolicy === 'on_activate' || prewarmPolicy === 'on_startup' ? prewarmPolicy : 'manual',
    warm_ttl_seconds:
      typeof policy?.warm_ttl_seconds === 'number' && Number.isFinite(policy.warm_ttl_seconds)
        ? Math.max(0, Math.trunc(policy.warm_ttl_seconds))
        : 900,
  }
}

function normalizeProviderView(provider: AgentProviderView): AgentProviderView {
  const createdBy = normalizeActor(provider.created_by)
  const updatedBy = normalizeActor(provider.updated_by)
  const base = {
    ...provider,
    access: normalizeAccessPolicy(provider.access, createdBy),
    created_by: createdBy,
    updated_by: updatedBy,
    route_policy: normalizeRoutePolicy(provider.route_policy),
  }
  if (provider.kind === 'codex') {
    return {
      ...base,
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
      ...base,
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
      ...base,
      openai_compatible: provider.openai_compatible
        ? {
            ...provider.openai_compatible,
            chat_models: normalizeChatModels(provider.openai_compatible.chat_models),
          }
        : provider.openai_compatible,
    }
  }

  return base
}

function normalizeProviderCatalog(catalog: AgentProviderCatalog): AgentProviderCatalog {
  return {
    ...catalog,
    current_actor: normalizeActor(catalog.current_actor),
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
    recent_runs_total:
      typeof snapshot.recent_runs_total === 'number' && Number.isFinite(snapshot.recent_runs_total)
        ? snapshot.recent_runs_total
        : 0,
    recent_runs_offset:
      typeof snapshot.recent_runs_offset === 'number' && Number.isFinite(snapshot.recent_runs_offset)
        ? snapshot.recent_runs_offset
        : 0,
    recent_runs_limit:
      typeof snapshot.recent_runs_limit === 'number' && Number.isFinite(snapshot.recent_runs_limit)
        ? snapshot.recent_runs_limit
        : 0,
    recent_runs_has_more: Boolean(snapshot.recent_runs_has_more),
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

export async function fetchAgentProviderGatewaySnapshot(query?: AgentProviderGatewaySnapshotQuery) {
  const searchParams = new URLSearchParams()
  if (query?.providerID?.trim()) {
    searchParams.set('provider_id', query.providerID.trim())
  }
  if (query?.status?.trim()) {
    searchParams.set('status', query.status.trim())
  }
  if (query?.query?.trim()) {
    searchParams.set('query', query.query.trim())
  }
  if (typeof query?.offset === 'number' && Number.isFinite(query.offset) && query.offset > 0) {
    searchParams.set('offset', String(Math.trunc(query.offset)))
  }
  if (typeof query?.limit === 'number' && Number.isFinite(query.limit) && query.limit > 0) {
    searchParams.set('limit', String(Math.trunc(query.limit)))
  }
  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return normalizeProviderGatewaySnapshot(
    await requestProviderRuntimeJSON<AgentProviderGatewaySnapshot>(
      `/api/v1/agent/providers/gateway${suffix}`,
    ),
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

export async function prewarmAgentProvider(providerID: string) {
  return await requestProviderRuntimeJSON<AgentProviderPrewarmResult>(
    `/api/v1/agent/providers/${encodeURIComponent(providerID)}/prewarm`,
    {
      method: 'POST',
    },
  )
}

export async function clearAgentProviderRouteState(providerID: string) {
  return await requestProviderRuntimeJSON<{ provider_id: string; cleared: boolean }>(
    `/api/v1/agent/providers/${encodeURIComponent(providerID)}/route-state/clear`,
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
