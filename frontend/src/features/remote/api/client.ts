import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type RemoteProfile = {
  description?: string
  host: string
  id: string
  identity_file?: string
  name: string
  port?: number
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

export type SaveRemoteProfilePayload = {
  host: string
  id?: string
  identity_file?: string
  name?: string
  port?: number
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
        name: payload.name?.trim() || undefined,
        port: payload.port,
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
