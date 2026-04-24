import { resolveRuntimeContext } from '@/shared/api/runtime'

export type WorkspaceWidgetSnapshot = {
  id: string
  kind: string
  title: string
  description?: string
  terminal_id?: string
  connection_id?: string
  path?: string
}

export type WorkspaceSnapshot = {
  id: string
  name: string
  active_widget_id?: string
  widgets: WorkspaceWidgetSnapshot[]
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

export class WorkspaceAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'WorkspaceAPIError'
    this.status = status
    this.code = code
  }
}

export async function fetchWorkspaceSnapshot() {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/workspace`, {
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
    },
  })

  if (!response.ok) {
    let errorPayload: APIErrorEnvelope | null = null

    try {
      errorPayload = (await response.json()) as APIErrorEnvelope
    } catch {
      errorPayload = null
    }

    throw new WorkspaceAPIError(
      response.status,
      errorPayload?.error?.code ?? 'workspace_request_failed',
      errorPayload?.error?.message ?? `Workspace request failed (${response.status})`,
    )
  }

  return (await response.json()) as WorkspaceSnapshot
}
