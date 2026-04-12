import type {
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

  async executeTool(request: ExecuteToolRequest): Promise<ExecuteToolResponse> {
    return this.request<ExecuteToolResponse>('/api/v1/tools/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    })
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
    url.searchParams.set('token', this.runtime.auth_token)
    return url.toString()
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {})
    headers.set('Authorization', `Bearer ${this.runtime.auth_token}`)
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const response = await fetch(new URL(path, this.runtime.base_url), {
      ...init,
      headers,
    })
    if (!response.ok) {
      throw new Error((await response.text()) || `Request failed with ${response.status}`)
    }
    return response.json() as Promise<T>
  }
}
