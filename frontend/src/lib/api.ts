import type {
  AgentCatalog,
  AuditEvent,
  BootstrapPayload,
  ExecuteToolRequest,
  ExecuteToolResponse,
  ToolInfo,
  Workspace,
} from '../types'
import type { RuntimeInfo } from './runtime'

export class RtermClient {
  private readonly runtime: RuntimeInfo

  constructor(runtime: RuntimeInfo) {
    this.runtime = runtime
  }

  async bootstrap(): Promise<BootstrapPayload> {
    return this.request<BootstrapPayload>('/api/v1/bootstrap')
  }

  async workspace(): Promise<Workspace> {
    return this.request<Workspace>('/api/v1/workspace')
  }

  async tools(): Promise<{ tools: ToolInfo[] }> {
    return this.request<{ tools: ToolInfo[] }>('/api/v1/tools')
  }

  async agentCatalog(): Promise<AgentCatalog> {
    return this.request<AgentCatalog>('/api/v1/agent')
  }

  async setActiveProfile(id: string): Promise<AgentCatalog> {
    return this.request<AgentCatalog>('/api/v1/agent/selection/profile', {
      method: 'PUT',
      body: JSON.stringify({ id }),
    })
  }

  async setActiveRole(id: string): Promise<AgentCatalog> {
    return this.request<AgentCatalog>('/api/v1/agent/selection/role', {
      method: 'PUT',
      body: JSON.stringify({ id }),
    })
  }

  async setActiveMode(id: string): Promise<AgentCatalog> {
    return this.request<AgentCatalog>('/api/v1/agent/selection/mode', {
      method: 'PUT',
      body: JSON.stringify({ id }),
    })
  }

  async executeTool(request: ExecuteToolRequest): Promise<ExecuteToolResponse> {
    const response = await this.fetch('/api/v1/tools/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    const payload = (await response.json().catch(() => null)) as
      | ExecuteToolResponse
      | { error?: { message?: string } }
      | null
    if (this.isExecuteToolResponse(payload)) {
      return payload
    }
    if (!response.ok) {
      throw new Error(payload?.error?.message || `Request failed with ${response.status}`)
    }
    throw new Error('tool response payload is malformed')
  }

  async sendTerminalInput(widgetId: string, text: string, appendNewline = false) {
    return this.request(`/api/v1/terminal/${widgetId}/input`, {
      method: 'POST',
      body: JSON.stringify({ text, append_newline: appendNewline }),
    })
  }

  async audit(limit = 20): Promise<{ events: AuditEvent[] }> {
    return this.request<{ events: AuditEvent[] }>(`/api/v1/audit?limit=${limit}`)
  }

  terminalStreamUrl(widgetId: string, from = 0): string {
    const url = new URL(`/api/v1/terminal/${widgetId}/stream`, this.runtime.base_url)
    url.searchParams.set('from', String(from))
    // EventSource cannot attach Authorization headers, so the loopback stream
    // currently uses a scoped MVP query token until dedicated stream tickets land.
    url.searchParams.set('token', this.runtime.auth_token)
    return url.toString()
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetch(path, init)
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
      throw new Error(payload?.error?.message || `Request failed with ${response.status}`)
    }
    return response.json() as Promise<T>
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers ?? {})
    headers.set('Authorization', `Bearer ${this.runtime.auth_token}`)
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(new URL(path, this.runtime.base_url), {
      ...init,
      headers,
    })
  }

  private isExecuteToolResponse(payload: unknown): payload is ExecuteToolResponse {
    return typeof payload === 'object' && payload !== null && 'status' in payload
  }
}
