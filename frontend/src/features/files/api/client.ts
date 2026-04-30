import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type FilesDirectoryEntry = {
  hidden: boolean
  id: string
  kind: 'directory' | 'file'
  modified: string
  modifiedTime: number
  name: string
  sizeBytes: number
  sizeLabel: string
}

export type FilesDirectorySnapshot = {
  entries: FilesDirectoryEntry[]
  path: string
}

type FilesRequestOptions = {
  connectionId?: string
  signal?: AbortSignal
  widgetId?: string
}

type FSNode = {
  modified_time?: number
  name: string
  size?: number
  type: 'directory' | 'file'
}

type FSListPayload = {
  directories?: FSNode[]
  files?: FSNode[]
  path: string
}

type FSOpenPayload = {
  path: string
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

export class FilesAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'FilesAPIError'
    this.status = status
    this.code = code
  }
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatModifiedTime(timestamp?: number) {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp * 1000)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 16).replace('T', ' ')
}

function toFilesEntry(path: string, node: FSNode): FilesDirectoryEntry {
  const kind = node.type === 'directory' ? 'directory' : 'file'

  return {
    hidden: node.name.startsWith('.'),
    id: `${path}::${node.name}`,
    kind,
    modified: formatModifiedTime(node.modified_time),
    modifiedTime: node.modified_time ?? 0,
    name: node.name,
    sizeBytes: kind === 'file' ? (node.size ?? 0) : 0,
    sizeLabel: kind === 'file' ? formatBytes(node.size ?? 0) : '',
  }
}

async function fetchRuntimeJSON<T>(runtimeContext: RuntimeContext, path: string, init?: RequestInit) {
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

    throw new FilesAPIError(
      response.status,
      errorPayload?.error?.code ?? 'files_request_failed',
      errorPayload?.error?.message ?? `Files request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

async function postRuntimeJSON<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const runtimeContext = await resolveRuntimeContext()

  return fetchRuntimeJSON<T>(runtimeContext, path, {
    body: JSON.stringify(body),
    method: 'POST',
  })
}

export async function listFilesDirectory(
  path: string,
  options?: FilesRequestOptions,
): Promise<FilesDirectorySnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const params = new URLSearchParams({ path })

  if (options?.connectionId?.trim()) {
    params.set('connection_id', options.connectionId.trim())
  }
  if (options?.widgetId?.trim()) {
    params.set('widget_id', options.widgetId.trim())
  }

  const payload = await fetchRuntimeJSON<FSListPayload>(
    runtimeContext,
    `/api/v1/fs/list?${params.toString()}`,
    {
      signal: options?.signal,
    },
  )

  return {
    entries: [...(payload.directories ?? []), ...(payload.files ?? [])].map((node) =>
      toFilesEntry(payload.path, node),
    ),
    path: payload.path,
  }
}

export async function openFilesPathExternally(path: string, options?: FilesRequestOptions) {
  return postRuntimeJSON<FSOpenPayload>('/api/v1/fs/open', {
    connection_id: options?.connectionId?.trim() || undefined,
    path,
    widget_id: options?.widgetId?.trim() || undefined,
  })
}
