import { expect, type APIRequestContext, type Page } from '@playwright/test'

import { authToken, backendUrl } from './test-env'

export type BootstrapPayload = {
  home_dir: string
  repo_root: string
  workspace: {
    active_widget_id: string
  }
}

export type WorkspaceSnapshot = {
  active_tab_id?: string
  active_widget_id?: string
  tabs: Array<{
    id: string
  }>
}

export type DirectoryListing = {
  directories?: Array<{ name: string }>
  files?: Array<{ name: string }>
  path: string
}

export type FileSnapshot = {
  content: string
  path: string
}

export type TerminalSnapshot = {
  state: {
    can_send_input?: boolean
    can_interrupt?: boolean
    connection_kind?: string
    started_at?: string
    shell?: string
    status_detail?: string
    widget_id: string
    status: string
  }
  chunks: Array<{
    data: string
    seq: number
    timestamp: string
  }>
  next_seq: number
}

export type TerminalSettings = {
  cursor_blink: boolean
  cursor_style: 'block' | 'bar' | 'underline'
  font_size: number
  line_height: number
  scrollback: number
  theme_mode: 'adaptive' | 'contrast'
}

export type AgentConversationMessage = {
  content: string
  created_at: string
  id: string
  model?: string
  provider?: string
  reasoning?: string
  role: 'assistant' | 'system' | 'user'
  status: 'complete' | 'error' | 'streaming'
}

export type AgentConversationSnapshot = {
  id: string
  title: string
  messages: AgentConversationMessage[]
  provider: {
    kind: string
    model?: string
    streaming: boolean
  }
  context_preferences?: {
    widget_context_enabled: boolean
    widget_ids?: string[]
  }
  created_at: string
  updated_at: string
  archived_at?: string
}

export type AgentConversationSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
  archived_at?: string
  message_count: number
}

export type AgentConversationList = {
  active_conversation_id: string
  conversations: AgentConversationSummary[]
}

export type AgentProviderCatalog = {
  active_provider_id: string
  providers: Array<{
    active: boolean
    claude?: {
      model: string
      status_message?: string
      status_state: 'auth-required' | 'missing' | 'ready'
    }
    codex?: {
      model: string
      status_message?: string
      status_state: 'auth-required' | 'missing' | 'ready'
    }
    openai_compatible?: {
      base_url: string
      chat_models?: string[]
      model: string
    }
    display_name: string
    enabled: boolean
    id: string
    kind: 'claude' | 'codex' | 'openai-compatible'
  }>
  supported_kinds: Array<'claude' | 'codex' | 'openai-compatible'>
}

function authHeaders() {
  return {
    Authorization: `Bearer ${authToken}`,
  }
}

async function expectJSONResponse<T>(responsePromise: ReturnType<APIRequestContext['get']>) {
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()
  return response.json() as Promise<T>
}

export async function clearBrowserState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
}

export function formatDisplayPath(path: string, homeDir: string) {
  if (path === homeDir) {
    return '~'
  }

  if (homeDir && path.startsWith(`${homeDir}/`)) {
    return `~${path.slice(homeDir.length)}`
  }

  return path
}

export async function fetchBootstrap(request: APIRequestContext) {
  return expectJSONResponse<BootstrapPayload>(
    request.get(`${backendUrl}/api/v1/bootstrap`, {
      headers: authHeaders(),
    }),
  )
}

export async function fetchWorkspaceSnapshot(request: APIRequestContext) {
  return expectJSONResponse<WorkspaceSnapshot>(
    request.get(`${backendUrl}/api/v1/workspace`, {
      headers: authHeaders(),
    }),
  )
}

export async function mkdirViaApi(request: APIRequestContext, path: string) {
  const response = await request.post(`${backendUrl}/api/v1/fs/mkdir`, {
    data: { path },
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
}

export async function copyViaApi(request: APIRequestContext, sourcePath: string, targetPath: string) {
  const response = await request.post(`${backendUrl}/api/v1/fs/copy`, {
    data: {
      source_paths: [sourcePath],
      target_path: targetPath,
    },
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
}

export async function listDirectoryViaApi(request: APIRequestContext, path: string) {
  return expectJSONResponse<DirectoryListing>(
    request.get(`${backendUrl}/api/v1/fs/list?path=${encodeURIComponent(path)}`, {
      headers: authHeaders(),
    }),
  )
}

export async function readFileViaApi(request: APIRequestContext, path: string) {
  return expectJSONResponse<FileSnapshot>(
    request.get(`${backendUrl}/api/v1/fs/file?path=${encodeURIComponent(path)}`, {
      headers: authHeaders(),
    }),
  )
}

export async function fetchTerminalSnapshot(request: APIRequestContext, widgetID: string) {
  return expectJSONResponse<TerminalSnapshot>(
    request.get(`${backendUrl}/api/v1/terminal/${encodeURIComponent(widgetID)}`, {
      headers: authHeaders(),
    }),
  )
}

export async function fetchTerminalSettings(request: APIRequestContext) {
  const payload = await expectJSONResponse<{ settings: TerminalSettings }>(
    request.get(`${backendUrl}/api/v1/settings/terminal`, {
      headers: authHeaders(),
    }),
  )

  return payload.settings
}

export async function updateTerminalSettingsViaApi(
  request: APIRequestContext,
  settings: {
    cursor_blink?: boolean
    cursor_style?: 'block' | 'bar' | 'underline'
    font_size?: number
    line_height?: number
    scrollback?: number
    theme_mode?: 'adaptive' | 'contrast'
  },
) {
  const response = await request.put(`${backendUrl}/api/v1/settings/terminal`, {
    data: settings,
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
}

export async function sendTerminalInputViaApi(
  request: APIRequestContext,
  widgetID: string,
  text: string,
  appendNewline = false,
) {
  const response = await request.post(`${backendUrl}/api/v1/terminal/${encodeURIComponent(widgetID)}/input`, {
    data: {
      append_newline: appendNewline,
      text,
    },
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
}

export async function fetchAgentConversation(request: APIRequestContext) {
  const payload = await expectJSONResponse<{ conversation: AgentConversationSnapshot }>(
    request.get(`${backendUrl}/api/v1/agent/conversation`, {
      headers: authHeaders(),
    }),
  )
  return {
    ...payload.conversation,
    context_preferences: {
      widget_context_enabled: payload.conversation.context_preferences?.widget_context_enabled ?? true,
      widget_ids: Array.isArray(payload.conversation.context_preferences?.widget_ids)
        ? payload.conversation.context_preferences.widget_ids
        : [],
    },
    messages: Array.isArray(payload.conversation.messages) ? payload.conversation.messages : [],
  }
}

export async function fetchAgentConversations(request: APIRequestContext) {
  return expectJSONResponse<AgentConversationList>(
    request.get(`${backendUrl}/api/v1/agent/conversations`, {
      headers: authHeaders(),
    }),
  )
}

export async function renameAgentConversation(
  request: APIRequestContext,
  conversationID: string,
  title: string,
) {
  return expectJSONResponse<{ conversation: AgentConversationSnapshot }>(
    request.patch(`${backendUrl}/api/v1/agent/conversations/${encodeURIComponent(conversationID)}`, {
      data: { title },
      headers: authHeaders(),
    }),
  )
}

export async function createAgentConversation(request: APIRequestContext) {
  const response = await request.post(`${backendUrl}/api/v1/agent/conversations`, {
    data: {},
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { conversation: AgentConversationSnapshot }
  return payload.conversation
}

export async function activateAgentConversation(request: APIRequestContext, conversationID: string) {
  const response = await request.put(
    `${backendUrl}/api/v1/agent/conversations/${encodeURIComponent(conversationID)}/activate`,
    {
      headers: authHeaders(),
    },
  )

  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { conversation: AgentConversationSnapshot }
  return payload.conversation
}

export async function updateAgentConversationContext(
  request: APIRequestContext,
  conversationID: string,
  preferences: {
    widget_context_enabled: boolean
    widget_ids?: string[]
  },
) {
  const response = await request.put(
    `${backendUrl}/api/v1/agent/conversations/${encodeURIComponent(conversationID)}/context`,
    {
      data: preferences,
      headers: authHeaders(),
    },
  )

  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { conversation: AgentConversationSnapshot }
  return payload.conversation
}

export async function deleteAgentConversation(request: APIRequestContext, conversationID: string) {
  const response = await request.delete(
    `${backendUrl}/api/v1/agent/conversations/${encodeURIComponent(conversationID)}`,
    {
      headers: authHeaders(),
    },
  )

  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { conversation: AgentConversationSnapshot }
  return payload.conversation
}

export async function archiveAgentConversation(request: APIRequestContext, conversationID: string) {
  const response = await request.put(
    `${backendUrl}/api/v1/agent/conversations/${encodeURIComponent(conversationID)}/archive`,
    {
      headers: authHeaders(),
    },
  )

  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { conversation: AgentConversationSnapshot }
  return payload.conversation
}

export async function restoreAgentConversation(request: APIRequestContext, conversationID: string) {
  const response = await request.put(
    `${backendUrl}/api/v1/agent/conversations/${encodeURIComponent(conversationID)}/restore`,
    {
      headers: authHeaders(),
    },
  )

  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { conversation: AgentConversationSnapshot }
  return payload.conversation
}

export async function fetchAgentProviderCatalog(request: APIRequestContext) {
  return expectJSONResponse<AgentProviderCatalog>(
    request.get(`${backendUrl}/api/v1/agent/providers`, {
      headers: authHeaders(),
    }),
  )
}

export async function setActiveAgentProvider(request: APIRequestContext, providerID: string) {
  const response = await request.put(`${backendUrl}/api/v1/agent/providers/active`, {
    data: { id: providerID },
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
}

export async function createAgentProvider(
  request: APIRequestContext,
  payload: Record<string, unknown>,
) {
  const response = await request.post(`${backendUrl}/api/v1/agent/providers`, {
    data: payload,
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
  return response.json() as Promise<{
    provider: AgentProviderCatalog['providers'][number]
    providers: AgentProviderCatalog
  }>
}

export async function updateAgentProvider(
  request: APIRequestContext,
  providerID: string,
  payload: Record<string, unknown>,
) {
  const response = await request.patch(`${backendUrl}/api/v1/agent/providers/${encodeURIComponent(providerID)}`, {
    data: payload,
    headers: authHeaders(),
  })

  expect(response.ok()).toBeTruthy()
  return response.json() as Promise<{
    provider: AgentProviderCatalog['providers'][number]
    providers: AgentProviderCatalog
  }>
}
