import type {
  CommanderDirectoryEntry,
  CommanderDirectorySnapshot,
  CommanderFileSnapshot,
} from '@/features/commander/model/types'
import { joinRuntimePath, resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

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

type FSReadPayload = {
  path: string
  preview: string
  preview_available: boolean
  preview_bytes?: number
  preview_kind?: 'hex' | 'text'
  size_bytes?: number
  truncated: boolean
}

type FSFilePayload = {
  content: string
  path: string
}

type FSOpenPayload = {
  path: string
}

type FSMkdirPayload = {
  path: string
}

type FSPathsPayload = {
  paths: string[]
}

type FSCopyEntriesPayload = {
  entries: Array<{
    source_path: string
    target_path: string
  }>
}

type FSRenamePayload = {
  entries: Array<{
    next_name: string
    path: string
  }>
  overwrite?: boolean
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

export class CommanderAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'CommanderAPIError'
    this.status = status
    this.code = code
  }
}

type ListCommanderDirectoryOptions = {
  query?: string
}

function toCommanderEntryId(path: string, name: string) {
  return `${path}::${name}`
}

function getParentPath(path: string) {
  const lastSlashIndex = path.lastIndexOf('/')

  if (lastSlashIndex <= 0) {
    return '/'
  }

  return path.slice(0, lastSlashIndex)
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatModifiedTime(timestamp?: number) {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp * 1000)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getUTCFullYear())
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function getEntryExtension(name: string, kind: CommanderDirectoryEntry['kind']) {
  if (kind !== 'file') {
    return ''
  }

  const dotIndex = name.lastIndexOf('.')

  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return ''
  }

  return name.slice(dotIndex + 1).toLowerCase()
}

function mapFSNode(path: string, node: FSNode): CommanderDirectoryEntry {
  const kind = node.type === 'directory' ? 'folder' : 'file'
  const sizeBytes = kind === 'file' ? (node.size ?? 0) : null

  return {
    id: toCommanderEntryId(path, node.name),
    name: node.name,
    ext: getEntryExtension(node.name, kind),
    kind,
    sizeLabel: kind === 'file' ? formatBytes(node.size ?? 0) : '',
    sizeBytes,
    modified: formatModifiedTime(node.modified_time),
    hidden: node.name.startsWith('.'),
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

    throw new CommanderAPIError(
      response.status,
      errorPayload?.error?.code ?? 'commander_request_failed',
      errorPayload?.error?.message ?? `Commander request failed (${response.status})`,
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

async function putRuntimeJSON<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const runtimeContext = await resolveRuntimeContext()

  return fetchRuntimeJSON<T>(runtimeContext, path, {
    body: JSON.stringify(body),
    method: 'PUT',
  })
}

export async function listCommanderDirectory(
  path: string,
  options?: ListCommanderDirectoryOptions,
): Promise<CommanderDirectorySnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const params = new URLSearchParams({
    path,
  })

  if (options?.query?.trim()) {
    params.set('query', options.query.trim())
  }

  const payload = await fetchRuntimeJSON<FSListPayload>(
    runtimeContext,
    `/api/v1/fs/list?${params.toString()}`,
  )
  const entries = [...(payload.directories ?? []), ...(payload.files ?? [])].map((node) =>
    mapFSNode(payload.path, node),
  )

  return {
    entries,
    path: payload.path,
  }
}

export async function readCommanderFilePreview(
  path: string,
  options?: {
    maxBytes?: number
  },
): Promise<CommanderFileSnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const maxBytesQuery = options?.maxBytes ? `&max_bytes=${options.maxBytes}` : ''
  const payload = await fetchRuntimeJSON<FSReadPayload>(
    runtimeContext,
    `/api/v1/fs/read?path=${encodeURIComponent(path)}${maxBytesQuery}`,
  )
  const entryName = payload.path.split('/').pop() ?? payload.path
  const content = payload.preview_available ? payload.preview : ''

  return {
    content: payload.truncated ? `${content}\n\n[Preview truncated.]` : content,
    entryId: toCommanderEntryId(payload.path.slice(0, payload.path.lastIndexOf('/')) || '/', entryName),
    entryName,
    path: payload.path.slice(0, payload.path.lastIndexOf('/')) || '/',
    previewAvailable: payload.preview_available,
    previewKind: payload.preview_kind === 'hex' ? 'hex' : 'text',
    previewBytes: payload.preview_bytes,
    sizeBytes: payload.size_bytes,
    truncated: payload.truncated,
  }
}

export async function readCommanderFile(path: string): Promise<CommanderFileSnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const payload = await fetchRuntimeJSON<FSFilePayload>(
    runtimeContext,
    `/api/v1/fs/file?path=${encodeURIComponent(path)}`,
  )
  const entryName = payload.path.split('/').pop() ?? payload.path

  return {
    content: payload.content,
    entryId: toCommanderEntryId(payload.path.slice(0, payload.path.lastIndexOf('/')) || '/', entryName),
    entryName,
    path: payload.path.slice(0, payload.path.lastIndexOf('/')) || '/',
    previewAvailable: true,
    previewKind: 'text',
  }
}

export async function writeCommanderFile(path: string, content: string): Promise<CommanderFileSnapshot> {
  const payload = await putRuntimeJSON<FSFilePayload>('/api/v1/fs/file', {
    content,
    path,
  })
  const entryName = payload.path.split('/').pop() ?? payload.path

  return {
    content: payload.content,
    entryId: toCommanderEntryId(payload.path.slice(0, payload.path.lastIndexOf('/')) || '/', entryName),
    entryName,
    path: payload.path.slice(0, payload.path.lastIndexOf('/')) || '/',
    previewAvailable: true,
    previewKind: 'text',
  }
}

export async function openCommanderFileExternally(path: string) {
  return postRuntimeJSON<FSOpenPayload>('/api/v1/fs/open', {
    path,
  })
}

export async function mkdirCommanderDirectory(path: string) {
  const payload = await postRuntimeJSON<FSMkdirPayload>('/api/v1/fs/mkdir', { path })
  const entryName = payload.path.split('/').pop() ?? payload.path
  const parentPath = getParentPath(payload.path)

  return {
    entryId: toCommanderEntryId(parentPath, entryName),
    entryName,
    parentPath,
    path: payload.path,
  }
}

export async function copyCommanderEntries(
  sourcePaths: string[],
  targetPath: string,
  options?: {
    overwrite?: boolean
  },
) {
  return postRuntimeJSON<FSPathsPayload>('/api/v1/fs/copy', {
    overwrite: options?.overwrite ?? false,
    source_paths: sourcePaths,
    target_path: targetPath,
  })
}

export async function copyCommanderEntriesToPaths(
  entries: FSCopyEntriesPayload['entries'],
  options?: {
    overwrite?: boolean
  },
) {
  return postRuntimeJSON<FSPathsPayload>('/api/v1/fs/copy', {
    entries,
    overwrite: options?.overwrite ?? false,
  })
}

export async function moveCommanderEntries(
  sourcePaths: string[],
  targetPath: string,
  options?: {
    overwrite?: boolean
  },
) {
  return postRuntimeJSON<FSPathsPayload>('/api/v1/fs/move', {
    overwrite: options?.overwrite ?? false,
    source_paths: sourcePaths,
    target_path: targetPath,
  })
}

export async function deleteCommanderEntries(paths: string[]) {
  return postRuntimeJSON<FSPathsPayload>('/api/v1/fs/delete', {
    paths,
  })
}

export async function renameCommanderEntries(
  entries: FSRenamePayload['entries'],
  options?: {
    overwrite?: boolean
  },
) {
  return postRuntimeJSON<FSPathsPayload>('/api/v1/fs/rename', {
    entries,
    overwrite: options?.overwrite ?? false,
  })
}

export function toCommanderEntryPath(directoryPath: string, entryName: string) {
  return joinRuntimePath(directoryPath, entryName)
}
