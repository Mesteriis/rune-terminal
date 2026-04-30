import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type PreviewKind = 'hex' | 'text'

export type PreviewFileSnapshot = {
  content: string
  path: string
  previewBytes?: number
  previewKind: PreviewKind
  sizeBytes?: number
  truncated: boolean
}

type PreviewRequestOptions = {
  connectionId?: string
  maxBytes?: number
  signal?: AbortSignal
  widgetId?: string
}

type FSReadPayload = {
  path: string
  preview: string
  preview_available: boolean
  preview_bytes?: number
  preview_kind?: PreviewKind
  size_bytes?: number
  truncated: boolean
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

export class PreviewAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'PreviewAPIError'
    this.status = status
    this.code = code
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

    throw new PreviewAPIError(
      response.status,
      errorPayload?.error?.code ?? 'preview_request_failed',
      errorPayload?.error?.message ?? `Preview request failed (${response.status})`,
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

export async function readPreviewFile(
  path: string,
  options?: PreviewRequestOptions,
): Promise<PreviewFileSnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const params = new URLSearchParams({ path })

  if (options?.maxBytes) {
    params.set('max_bytes', String(options.maxBytes))
  }
  if (options?.connectionId?.trim()) {
    params.set('connection_id', options.connectionId.trim())
  }
  if (options?.widgetId?.trim()) {
    params.set('widget_id', options.widgetId.trim())
  }

  const payload = await fetchRuntimeJSON<FSReadPayload>(
    runtimeContext,
    `/api/v1/fs/read?${params.toString()}`,
    {
      signal: options?.signal,
    },
  )

  return {
    content: payload.preview_available ? payload.preview : '',
    path: payload.path,
    previewBytes: payload.preview_bytes,
    previewKind: payload.preview_kind === 'hex' ? 'hex' : 'text',
    sizeBytes: payload.size_bytes,
    truncated: payload.truncated,
  }
}

export async function openPreviewPathExternally(path: string, options?: PreviewRequestOptions) {
  return postRuntimeJSON<FSOpenPayload>('/api/v1/fs/open', {
    connection_id: options?.connectionId?.trim() || undefined,
    path,
    widget_id: options?.widgetId?.trim() || undefined,
  })
}
