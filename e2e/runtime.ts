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
    connection_kind?: string
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
  messages: AgentConversationMessage[]
  provider: {
    kind: string
    model?: string
    streaming: boolean
  }
  updated_at: string
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
    display_name: string
    enabled: boolean
    id: string
    kind: 'claude' | 'codex'
  }>
  supported_kinds: Array<'claude' | 'codex'>
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
