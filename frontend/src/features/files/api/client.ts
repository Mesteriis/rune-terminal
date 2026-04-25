import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type FilesDirectoryEntry = {
  id: string
  kind: 'directory' | 'file'
  modified: string
  name: string
  sizeLabel: string
}

export type FilesDirectorySnapshot = {
  entries: FilesDirectoryEntry[]
  path: string
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
    id: `${path}::${node.name}`,
    kind,
    modified: formatModifiedTime(node.modified_time),
    name: node.name,
    sizeLabel: kind === 'file' ? formatBytes(node.size ?? 0) : '',
  }
}

async function fetchRuntimeJSON<T>(runtimeContext: RuntimeContext, path: string) {
  const response = await fetch(`${runtimeContext.baseUrl}${path}`, {
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

    throw new FilesAPIError(
      response.status,
      errorPayload?.error?.code ?? 'files_request_failed',
      errorPayload?.error?.message ?? `Files request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

export async function listFilesDirectory(path: string): Promise<FilesDirectorySnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await fetchRuntimeJSON<FSListPayload>(
    runtimeContext,
    `/api/v1/fs/list?path=${encodeURIComponent(path)}`,
  )

  return {
    entries: [...(payload.directories ?? []), ...(payload.files ?? [])].map((node) =>
      toFilesEntry(payload.path, node),
    ),
    path: payload.path,
  }
}
