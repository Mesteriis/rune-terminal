import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type MCPServerType = 'process' | 'remote'
export type MCPServerState = 'stopped' | 'starting' | 'active' | 'idle' | 'stopped_auto'
export type MCPServerControlAction = 'start' | 'stop' | 'restart' | 'enable' | 'disable'
export type MCPTemplateAuthKind = 'none' | 'bearer_token' | 'header_value'
export type MCPProbeStatus = 'ready' | 'auth-required' | 'unreachable' | 'invalid-response' | 'error'

export type MCPServerView = {
  id: string
  type: MCPServerType
  endpoint?: string
  state: MCPServerState
  last_used?: string
  active: boolean
  enabled: boolean
}

export type RegisterRemoteMCPServerPayload = {
  id: string
  endpoint: string
  headers?: Record<string, string>
}

export type MCPServerDetails = MCPServerView & {
  headers: Record<string, string>
}

export type MCPServerTemplate = {
  id: string
  display_name: string
  description: string
  suggested_server_id?: string
  endpoint?: string
  auth: {
    kind: MCPTemplateAuthKind
    header_name?: string
    value_prefix?: string
    secret_label?: string
    secret_placeholder?: string
  }
}

export type MCPProbeResult = {
  status: MCPProbeStatus
  reachable: boolean
  message: string
  http_status?: number
  protocol_version?: string
  server_name?: string
  server_version?: string
  tool_count?: number
}

type MCPServerListResponse = {
  servers?: MCPServerView[]
}

type MCPServerMutationResponse = {
  server: MCPServerView
}

type MCPServerDetailsResponse = {
  server: MCPServerDetails
}

type MCPServerDeletionResponse = {
  server_id?: string
}

type MCPTemplateCatalogResponse = {
  templates?: MCPServerTemplate[]
}

type MCPProbeResponse = {
  probe: MCPProbeResult
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

export class MCPAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'MCPAPIError'
    this.status = status
    this.code = code
  }
}

async function requestMCPJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
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

    throw new MCPAPIError(
      response.status,
      errorPayload?.error?.code ?? 'mcp_request_failed',
      errorPayload?.error?.message ?? `MCP request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

function normalizeMCPServer(server: MCPServerView): MCPServerView {
  return {
    ...server,
    active: Boolean(server.active),
    enabled: server.enabled !== false,
    endpoint: server.endpoint?.trim() || undefined,
    id: server.id.trim(),
    last_used: server.last_used?.trim() || undefined,
    state: server.state,
    type: server.type,
  }
}

function normalizeMCPHeaders(headers: Record<string, string> | undefined) {
  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers ?? {})) {
    const headerName = key.trim()
    if (!headerName) {
      continue
    }
    normalized[headerName] = value
  }

  return normalized
}

function normalizeMCPServerDetails(server: MCPServerDetails): MCPServerDetails {
  return {
    ...normalizeMCPServer(server),
    headers: normalizeMCPHeaders(server.headers),
  }
}

function normalizeMCPTemplateAuthKind(kind: unknown): MCPTemplateAuthKind {
  return kind === 'bearer_token' || kind === 'header_value' ? kind : 'none'
}

function normalizeMCPServerTemplate(template: MCPServerTemplate): MCPServerTemplate {
  return {
    ...template,
    auth: {
      kind: normalizeMCPTemplateAuthKind(template.auth?.kind),
      header_name: template.auth?.header_name?.trim() || undefined,
      value_prefix: template.auth?.value_prefix ?? undefined,
      secret_label: template.auth?.secret_label?.trim() || undefined,
      secret_placeholder: template.auth?.secret_placeholder?.trim() || undefined,
    },
    description: template.description.trim(),
    display_name: template.display_name.trim(),
    endpoint: template.endpoint?.trim() || undefined,
    id: template.id.trim(),
    suggested_server_id: template.suggested_server_id?.trim() || undefined,
  }
}

function normalizeMCPProbeResult(probe: MCPProbeResult): MCPProbeResult {
  return {
    ...probe,
    http_status: typeof probe.http_status === 'number' ? probe.http_status : undefined,
    message: probe.message.trim(),
    protocol_version: probe.protocol_version?.trim() || undefined,
    server_name: probe.server_name?.trim() || undefined,
    server_version: probe.server_version?.trim() || undefined,
    status:
      probe.status === 'ready' ||
      probe.status === 'auth-required' ||
      probe.status === 'unreachable' ||
      probe.status === 'invalid-response'
        ? probe.status
        : 'error',
    tool_count: typeof probe.tool_count === 'number' ? probe.tool_count : undefined,
  }
}

export async function fetchMCPServers() {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestMCPJSON<MCPServerListResponse>(runtimeContext, '/api/v1/mcp/servers')

  return Array.isArray(payload.servers) ? payload.servers.map(normalizeMCPServer) : []
}

export async function fetchMCPTemplateCatalog() {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestMCPJSON<MCPTemplateCatalogResponse>(runtimeContext, '/api/v1/mcp/catalog')

  return Array.isArray(payload.templates) ? payload.templates.map(normalizeMCPServerTemplate) : []
}

export async function registerRemoteMCPServer(payload: RegisterRemoteMCPServerPayload) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestMCPJSON<MCPServerMutationResponse>(runtimeContext, '/api/v1/mcp/servers', {
    body: JSON.stringify({
      endpoint: payload.endpoint.trim(),
      headers: payload.headers ?? {},
      id: payload.id.trim(),
      type: 'remote',
    }),
    method: 'POST',
  })

  return normalizeMCPServer(response.server)
}

export async function probeMCPServer(payload: RegisterRemoteMCPServerPayload) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestMCPJSON<MCPProbeResponse>(runtimeContext, '/api/v1/mcp/probe', {
    body: JSON.stringify({
      endpoint: payload.endpoint.trim(),
      headers: payload.headers ?? {},
    }),
    method: 'POST',
  })

  return normalizeMCPProbeResult(response.probe)
}

export async function fetchMCPServerDetails(serverID: string) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestMCPJSON<MCPServerDetailsResponse>(
    runtimeContext,
    `/api/v1/mcp/servers/${encodeURIComponent(serverID)}`,
  )

  return normalizeMCPServerDetails(response.server)
}

export async function updateRemoteMCPServer(serverID: string, payload: RegisterRemoteMCPServerPayload) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestMCPJSON<MCPServerMutationResponse>(
    runtimeContext,
    `/api/v1/mcp/servers/${encodeURIComponent(serverID)}`,
    {
      body: JSON.stringify({
        endpoint: payload.endpoint.trim(),
        headers: payload.headers ?? {},
        id: payload.id.trim(),
        type: 'remote',
      }),
      method: 'PUT',
    },
  )

  return normalizeMCPServer(response.server)
}

export async function deleteMCPServer(serverID: string) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestMCPJSON<MCPServerDeletionResponse>(
    runtimeContext,
    `/api/v1/mcp/servers/${encodeURIComponent(serverID)}`,
    {
      method: 'DELETE',
    },
  )

  return response.server_id?.trim() || serverID.trim()
}

export async function controlMCPServer(serverID: string, action: MCPServerControlAction) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await requestMCPJSON<MCPServerMutationResponse>(
    runtimeContext,
    `/api/v1/mcp/servers/${encodeURIComponent(serverID)}/${action}`,
    {
      method: 'POST',
    },
  )

  return normalizeMCPServer(response.server)
}
