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

type FSReadPayload = {
  path: string
  preview: string
  preview_available: boolean
  preview_bytes?: number
  preview_kind?: PreviewKind
  size_bytes?: number
  truncated: boolean
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

    throw new PreviewAPIError(
      response.status,
      errorPayload?.error?.code ?? 'preview_request_failed',
      errorPayload?.error?.message ?? `Preview request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

export async function readPreviewFile(
  path: string,
  options?: { maxBytes?: number },
): Promise<PreviewFileSnapshot> {
  const runtimeContext = await resolveRuntimeContext()
  const params = new URLSearchParams({ path })

  if (options?.maxBytes) {
    params.set('max_bytes', String(options.maxBytes))
  }

  const payload = await fetchRuntimeJSON<FSReadPayload>(
    runtimeContext,
    `/api/v1/fs/read?${params.toString()}`,
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
