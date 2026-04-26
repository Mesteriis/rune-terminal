import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type RemoteProfile = {
  description?: string
  host: string
  id: string
  identity_file?: string
  launch_mode?: 'shell' | 'tmux'
  name: string
  port?: number
  tmux_session?: string
  user?: string
}

export type SSHConfigImportSkipped = {
  host?: string
  reason: string
}

export type SSHConfigImportResult = {
  imported: RemoteProfile[]
  profiles: RemoteProfile[]
  skipped?: SSHConfigImportSkipped[]
}

export type RemoteTmuxSession = {
  attached: boolean
  name: string
  window_count?: number
}

export type CreateRemoteProfileSessionResult = {
  connection_id: string
  profile_id: string
  remote_session_name?: string
  reused: boolean
  session_id: string
  tab_id: string
  widget_id: string
}

export type SaveRemoteProfilePayload = {
  host: string
  id?: string
  identity_file?: string
  launch_mode?: 'shell' | 'tmux'
  name?: string
  port?: number
  tmux_session?: string
  user?: string
}

export type RemoteConnectionRuntime = {
  check_status: 'unchecked' | 'passed' | 'failed'
  check_error?: string
  launch_status: 'idle' | 'succeeded' | 'failed'
  launch_error?: string
}

export type RemoteConnectionView = {
  active: boolean
  id: string
  kind: 'local' | 'ssh'
  name: string
  runtime: RemoteConnectionRuntime
  usability: 'available' | 'attention' | 'unknown'
}

export type RemoteConnectionsSnapshot = {
  active_connection_id: string
  connections: RemoteConnectionView[]
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

export class RemoteAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'RemoteAPIError'
    this.status = status
    this.code = code
  }
}

async function requestRemoteJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
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

    throw new RemoteAPIError(
      response.status,
      errorPayload?.error?.code ?? 'remote_request_failed',
      errorPayload?.error?.message ?? `Remote request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

export async function fetchRemoteProfiles() {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestRemoteJSON<{ profiles?: RemoteProfile[] }>(
    runtimeContext,
    '/api/v1/remote/profiles',
  )

  return Array.isArray(payload.profiles) ? payload.profiles : []
}

export async function saveRemoteProfile(payload: SaveRemoteProfilePayload) {
  const runtimeContext = await resolveRuntimeContext()

  return requestRemoteJSON<{ profile: RemoteProfile; profiles: RemoteProfile[] }>(
    runtimeContext,
    '/api/v1/remote/profiles',
    {
      body: JSON.stringify({
        host: payload.host.trim(),
        id: payload.id?.trim() || undefined,
        identity_file: payload.identity_file?.trim() || undefined,
        launch_mode: payload.launch_mode?.trim() || undefined,
        name: payload.name?.trim() || undefined,
        port: payload.port,
        tmux_session: payload.tmux_session?.trim() || undefined,
        user: payload.user?.trim() || undefined,
      }),
      method: 'POST',
    },
  )
}

export async function deleteRemoteProfile(profileID: string) {
  const runtimeContext = await resolveRuntimeContext()

  return requestRemoteJSON<{ profiles?: RemoteProfile[] }>(
    runtimeContext,
    `/api/v1/remote/profiles/${encodeURIComponent(profileID)}`,
    {
      method: 'DELETE',
    },
  )
}

export async function fetchRemoteConnectionsSnapshot() {
  const runtimeContext = await resolveRuntimeContext()

  return requestRemoteJSON<RemoteConnectionsSnapshot>(runtimeContext, '/api/v1/connections')
}

export async function checkRemoteProfileConnection(profileID: string) {
  const runtimeContext = await resolveRuntimeContext()

  return requestRemoteJSON<{ connection: RemoteConnectionView; connections: RemoteConnectionsSnapshot }>(
    runtimeContext,
    `/api/v1/connections/${encodeURIComponent(profileID)}/check`,
    {
      method: 'POST',
    },
  )
}

export async function selectRemoteProfileConnection(profileID: string) {
  const runtimeContext = await resolveRuntimeContext()

  return requestRemoteJSON<RemoteConnectionsSnapshot>(runtimeContext, '/api/v1/connections/active', {
    body: JSON.stringify({ connection_id: profileID.trim() }),
    method: 'PUT',
  })
}

export async function importSSHConfigProfiles(path?: string) {
  const runtimeContext = await resolveRuntimeContext()

  return requestRemoteJSON<SSHConfigImportResult>(
    runtimeContext,
    '/api/v1/remote/profiles/import-ssh-config',
    {
      body: JSON.stringify(path?.trim() ? { path: path.trim() } : {}),
      method: 'POST',
    },
  )
}

export async function fetchRemoteProfileTmuxSessions(profileID: string) {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await requestRemoteJSON<{ sessions?: RemoteTmuxSession[] }>(
    runtimeContext,
    `/api/v1/remote/profiles/${encodeURIComponent(profileID)}/tmux-sessions`,
  )

  return Array.isArray(payload.sessions) ? payload.sessions : []
}

export async function createRemoteProfileSession(
  profileID: string,
  payload?: { title?: string; tmux_session?: string },
) {
  const runtimeContext = await resolveRuntimeContext()
  return requestRemoteJSON<CreateRemoteProfileSessionResult>(
    runtimeContext,
    `/api/v1/remote/profiles/${encodeURIComponent(profileID)}/session`,
    {
      body: JSON.stringify({
        title: payload?.title?.trim() || undefined,
        tmux_session: payload?.tmux_session?.trim() || undefined,
      }),
      method: 'POST',
    },
  )
}
