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

export type WorkspaceWidgetKindStatus = 'available' | 'frontend-local' | 'planned'

export type WorkspaceWidgetKindCatalogEntry = {
  kind: string
  label: string
  description: string
  status: WorkspaceWidgetKindStatus
  runtime_owned: boolean
  can_create: boolean
  supports_connections: boolean
  supports_path: boolean
  default_title: string
  create_route?: string
  notes?: string
}

export type OpenDirectoryWorkspaceWidgetInput = {
  connectionId?: string
  path: string
  targetWidgetId: string
}

export type CreateWorkspaceWidgetResult = {
  tab_id: string
  widget_id: string
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

export async function fetchWorkspaceWidgetKindCatalog() {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/workspace/widget-kinds`, {
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
      errorPayload?.error?.code ?? 'workspace_widget_catalog_request_failed',
      errorPayload?.error?.message ?? `Workspace widget catalog request failed (${response.status})`,
    )
  }

  const payload = (await response.json()) as { widget_kinds?: WorkspaceWidgetKindCatalogEntry[] }
  return Array.isArray(payload.widget_kinds) ? payload.widget_kinds : []
}

export async function openDirectoryWorkspaceWidget({
  connectionId,
  path,
  targetWidgetId,
}: OpenDirectoryWorkspaceWidgetInput) {
  const runtimeContext = await resolveRuntimeContext()
  const response = await fetch(`${runtimeContext.baseUrl}/api/v1/workspace/widgets/open-directory`, {
    body: JSON.stringify({
      connection_id: connectionId,
      path,
      target_widget_id: targetWidgetId,
    }),
    headers: {
      Authorization: `Bearer ${runtimeContext.authToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
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
      errorPayload?.error?.code ?? 'workspace_open_directory_request_failed',
      errorPayload?.error?.message ?? `Workspace open-directory request failed (${response.status})`,
    )
  }

  return (await response.json()) as CreateWorkspaceWidgetResult
}
