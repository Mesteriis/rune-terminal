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
