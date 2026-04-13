import type {
  AgentCatalog,
  AgentConversationSnapshot,
  AgentTerminalCommandExplanationResult,
  AuditEvent,
  BootstrapPayload,
  Connection,
  ConnectionCatalog,
  ExecuteToolRequest,
  ExecuteToolResponse,
  IgnoreRule,
  TerminalSnapshot,
  TerminalState,
  ToolInfo,
  TrustedRule,
  Workspace,
} from '../types'
import type { RuntimeInfo } from './runtime'
import { normalizeConversationSnapshot } from './agentConversation'
import { normalizeTerminalSnapshot } from './terminal'
import { normalizeBootstrapPayload, normalizeConnection, normalizeConnectionCatalog, normalizeWorkspace } from './workspace'

export class RtermClient {
  private readonly runtime: RuntimeInfo

  constructor(runtime: RuntimeInfo) {
    this.runtime = runtime
  }

  async bootstrap(): Promise<BootstrapPayload> {
    return normalizeBootstrapPayload(await this.request<BootstrapPayload>('/api/v1/bootstrap'))
  }

  async workspace(): Promise<Workspace> {
    return normalizeWorkspace(await this.request<Workspace>('/api/v1/workspace'))
  }

  async focusWidget(widgetId: string): Promise<{ workspace: Workspace }> {
    return this.workspaceRequest('/api/v1/workspace/focus-widget', {
      method: 'POST',
      body: JSON.stringify({ widget_id: widgetId }),
    })
  }

  async focusTab(tabId: string): Promise<{ workspace: Workspace }> {
    return this.workspaceRequest('/api/v1/workspace/focus-tab', {
      method: 'POST',
      body: JSON.stringify({ tab_id: tabId }),
    })
  }

  async createTerminalTab(title?: string): Promise<{ tab_id: string; widget_id: string; workspace: Workspace }> {
    return this.workspaceRequest('/api/v1/workspace/tabs', {
      method: 'POST',
      body: JSON.stringify(title ? { title } : {}),
    })
  }

  async createTerminalTabWithConnection(
    connectionId: string,
    title?: string,
  ): Promise<{ tab_id: string; widget_id: string; workspace: Workspace }> {
    return this.workspaceRequest('/api/v1/workspace/tabs', {
      method: 'POST',
      body: JSON.stringify({ ...(title ? { title } : {}), connection_id: connectionId }),
    })
  }

  async renameTab(tabId: string, title: string): Promise<{ tab: unknown; workspace: Workspace }> {
    return this.workspaceRequest(`/api/v1/workspace/tabs/${tabId}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
  }

  async setTabPinned(tabId: string, pinned: boolean): Promise<{ tab: unknown; workspace: Workspace }> {
    return this.workspaceRequest(`/api/v1/workspace/tabs/${tabId}/pinned`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned }),
    })
  }

  async moveTab(tabId: string, beforeTabId: string): Promise<{ workspace: Workspace }> {
    return this.workspaceRequest('/api/v1/workspace/tabs/move', {
      method: 'POST',
      body: JSON.stringify({ tab_id: tabId, before_tab_id: beforeTabId }),
    })
  }

  async closeTab(tabId: string): Promise<{ closed_tab_id: string; workspace: Workspace }> {
    return this.workspaceRequest(`/api/v1/workspace/tabs/${tabId}`, {
      method: 'DELETE',
    })
  }

  async tools(): Promise<{ tools: ToolInfo[] }> {
    return this.request<{ tools: ToolInfo[] }>('/api/v1/tools')
  }

  async agentCatalog(): Promise<AgentCatalog> {
    return this.request<AgentCatalog>('/api/v1/agent')
  }

  async conversation(): Promise<AgentConversationSnapshot> {
    const payload = await this.request<{ conversation: AgentConversationSnapshot }>('/api/v1/agent/conversation')
    return normalizeConversationSnapshot(payload.conversation)
  }

  async submitConversationMessage(input: {
    prompt: string
    context?: {
      workspace_id?: string
      repo_root?: string
      active_widget_id?: string
      widget_context_enabled?: boolean
    }
  }): Promise<{ conversation: AgentConversationSnapshot; provider_error?: string }> {
    const payload = await this.request<{ conversation: AgentConversationSnapshot; provider_error?: string }>(
      '/api/v1/agent/conversation/messages',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return {
      ...payload,
      conversation: normalizeConversationSnapshot(payload.conversation),
    }
  }

  async explainTerminalCommand(input: {
    prompt: string
    command: string
    widget_id?: string
    from_seq?: number
    approval_used?: boolean
    context?: {
      workspace_id?: string
      repo_root?: string
      active_widget_id?: string
      widget_context_enabled?: boolean
    }
  }): Promise<AgentTerminalCommandExplanationResult> {
    const payload = await this.request<AgentTerminalCommandExplanationResult>('/api/v1/agent/terminal-commands/explain', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return {
      ...payload,
      conversation: normalizeConversationSnapshot(payload.conversation),
    }
  }

  async connections(): Promise<ConnectionCatalog> {
    return normalizeConnectionCatalog(await this.request<ConnectionCatalog>('/api/v1/connections'))
  }

  async checkConnection(connectionId: string): Promise<{ connection: Connection; connections: ConnectionCatalog }> {
    const result = await this.request<{ connection: Connection; connections: ConnectionCatalog }>(`/api/v1/connections/${connectionId}/check`, {
      method: 'POST',
    })
    return {
      ...result,
      connection: normalizeConnection(result.connection),
      connections: normalizeConnectionCatalog(result.connections),
    }
  }

  async selectActiveConnection(connectionId: string): Promise<ConnectionCatalog> {
    return normalizeConnectionCatalog(await this.request<ConnectionCatalog>('/api/v1/connections/active', {
      method: 'PUT',
      body: JSON.stringify({ connection_id: connectionId }),
    }))
  }

  async saveSSHConnection(input: {
    id?: string
    name?: string
    host: string
    user?: string
    port?: number
    identity_file?: string
  }): Promise<{ connection: Connection; connections: ConnectionCatalog }> {
    const result = await this.request<{ connection: Connection; connections: ConnectionCatalog }>('/api/v1/connections/ssh', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return {
      ...result,
      connection: normalizeConnection(result.connection),
      connections: normalizeConnectionCatalog(result.connections),
    }
  }

  async trustedRules(): Promise<{ rules: TrustedRule[] }> {
    return this.request<{ rules: TrustedRule[] }>('/api/v1/policy/trusted-rules')
  }

  async ignoreRules(): Promise<{ rules: IgnoreRule[] }> {
    return this.request<{ rules: IgnoreRule[] }>('/api/v1/policy/ignore-rules')
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

  async terminalSnapshot(widgetId: string, from = 0, fallbackState?: TerminalState | null): Promise<TerminalSnapshot> {
    return normalizeTerminalSnapshot(
      await this.request<TerminalSnapshot | null>(`/api/v1/terminal/${widgetId}?from=${from}`),
      widgetId,
      fallbackState,
      from,
    )
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

  private async workspaceRequest<T extends { workspace: Workspace }>(path: string, init?: RequestInit): Promise<T> {
    const payload = await this.request<T>(path, init)
    return {
      ...payload,
      workspace: normalizeWorkspace(payload.workspace),
    }
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
