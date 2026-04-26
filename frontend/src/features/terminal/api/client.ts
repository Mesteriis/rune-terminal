import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'

export type TerminalRuntimeStatus = 'starting' | 'running' | 'exited' | 'failed' | 'disconnected' | string

export type TerminalRuntimeState = {
  widget_id: string
  session_id: string
  shell: string
  restored?: boolean
  status_detail?: string
  connection_id?: string
  connection_name?: string
  connection_kind?: string
  pid: number
  status: TerminalRuntimeStatus
  started_at: string
  last_output_at?: string
  exit_code?: number
  can_send_input: boolean
  can_interrupt: boolean
  working_dir?: string
}

export type TerminalOutputChunk = {
  seq: number
  data: string
  timestamp: string
}

export type TerminalSnapshot = {
  state: TerminalRuntimeState
  chunks: TerminalOutputChunk[]
  next_seq: number
  active_session_id?: string
  sessions?: TerminalRuntimeState[]
}

export type TerminalInputResult = {
  widget_id: string
  bytes_sent: number
  append_newline: boolean
}

export type TerminalDiagnostics = {
  widget_id: string
  session_state: string
  status_detail?: string
  issue_summary?: string
  output_excerpt?: string
}

export type CreateTerminalTabResult = {
  tab_id: string
  widget_id: string
}

export type CloseTerminalTabResult = {
  closed_tab_id: string
}

export type CreateSplitTerminalWidgetInput = {
  connectionId?: string
  direction?: 'left' | 'right' | 'top' | 'bottom'
  tabId?: string
  targetWidgetId: string
  title?: string
  workingDir?: string
}

export type TerminalStreamConnection = {
  close: () => void
  done: Promise<void>
}

type TerminalRestartResponse = {
  state: TerminalRuntimeState
}

type TerminalInterruptResponse = {
  state: TerminalRuntimeState
}

type APIErrorEnvelope = {
  error?: {
    code?: string
    message?: string
  }
}

type TerminalStreamOptions = {
  from?: number
  onError?: (error: unknown) => void
  onOutput: (chunk: TerminalOutputChunk) => void
  signal?: AbortSignal
}

function normalizeTerminalChunks(chunks: unknown): TerminalOutputChunk[] {
  return Array.isArray(chunks) ? chunks : []
}

function normalizeTerminalSessions(sessions: unknown): TerminalRuntimeState[] {
  return Array.isArray(sessions) ? (sessions as TerminalRuntimeState[]) : []
}

function normalizeTerminalSnapshot(snapshot: TerminalSnapshot): TerminalSnapshot {
  return {
    ...snapshot,
    sessions: normalizeTerminalSessions(snapshot.sessions),
    chunks: normalizeTerminalChunks(snapshot.chunks),
  }
}

export class TerminalAPIError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'TerminalAPIError'
    this.status = status
    this.code = code
  }
}

function buildTerminalPath(widgetID: string, suffix = '', from?: number) {
  const encodedWidgetID = encodeURIComponent(widgetID)
  const basePath = `/api/v1/terminal/${encodedWidgetID}${suffix}`

  if (typeof from !== 'number') {
    return basePath
  }

  return `${basePath}?from=${encodeURIComponent(String(from))}`
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

    throw new TerminalAPIError(
      response.status,
      errorPayload?.error?.code ?? 'terminal_request_failed',
      errorPayload?.error?.message ?? `Terminal request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

async function requestRuntimeJSON<T>(path: string, init?: RequestInit) {
  const runtimeContext = await resolveRuntimeContext()
  return fetchRuntimeJSON<T>(runtimeContext, path, init)
}

function parseEventBlock(block: string) {
  const dataLines: string[] = []
  let eventName = 'message'

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') {
      eventName = value
      continue
    }

    if (field === 'data') {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  return {
    data: dataLines.join('\n'),
    event: eventName,
  }
}

async function consumeTerminalStream(
  body: ReadableStream<Uint8Array>,
  onOutput: (chunk: TerminalOutputChunk) => void,
) {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffer = ''

  const flushBuffer = (flushRemainder = false) => {
    let normalizedBuffer = buffer.replace(/\r\n?/g, '\n')
    let boundaryIndex = normalizedBuffer.indexOf('\n\n')

    while (boundaryIndex >= 0) {
      const eventBlock = normalizedBuffer.slice(0, boundaryIndex)
      normalizedBuffer = normalizedBuffer.slice(boundaryIndex + 2)
      const parsedEvent = parseEventBlock(eventBlock)

      if (parsedEvent?.event === 'output') {
        onOutput(JSON.parse(parsedEvent.data) as TerminalOutputChunk)
      }

      boundaryIndex = normalizedBuffer.indexOf('\n\n')
    }

    buffer = flushRemainder ? '' : normalizedBuffer

    if (flushRemainder && normalizedBuffer.trim() !== '') {
      const parsedEvent = parseEventBlock(normalizedBuffer)

      if (parsedEvent?.event === 'output') {
        onOutput(JSON.parse(parsedEvent.data) as TerminalOutputChunk)
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    flushBuffer(done)

    if (done) {
      return
    }
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function attachAbortSignal(signal: AbortSignal | undefined, controller: AbortController) {
  if (!signal) {
    return () => {}
  }

  if (signal.aborted) {
    controller.abort(signal.reason)
    return () => {}
  }

  const abortListener = () => controller.abort(signal.reason)
  signal.addEventListener('abort', abortListener, { once: true })

  return () => {
    signal.removeEventListener('abort', abortListener)
  }
}

export async function fetchTerminalSnapshot(widgetID: string, from?: number) {
  const snapshot = await requestRuntimeJSON<TerminalSnapshot>(buildTerminalPath(widgetID, '', from))
  return normalizeTerminalSnapshot(snapshot)
}

export async function createTerminalSession(widgetID: string) {
  const snapshot = await requestRuntimeJSON<TerminalSnapshot>(buildTerminalPath(widgetID, '/sessions'), {
    method: 'POST',
  })
  return normalizeTerminalSnapshot(snapshot)
}

export async function setActiveTerminalSession(widgetID: string, sessionID: string) {
  const snapshot = await requestRuntimeJSON<TerminalSnapshot>(
    buildTerminalPath(widgetID, '/sessions/active'),
    {
      body: JSON.stringify({
        session_id: sessionID,
      }),
      method: 'PUT',
    },
  )
  return normalizeTerminalSnapshot(snapshot)
}

export async function fetchTerminalDiagnostics(widgetID: string) {
  return requestRuntimeJSON<TerminalDiagnostics>(buildTerminalPath(widgetID, '/diagnostics'))
}

export async function createTerminalTab(title?: string) {
  return requestRuntimeJSON<CreateTerminalTabResult>('/api/v1/workspace/tabs', {
    body: JSON.stringify(
      title && title.trim()
        ? {
            title,
          }
        : {},
    ),
    method: 'POST',
  })
}

export async function createSplitTerminalWidget({
  connectionId,
  direction = 'right',
  tabId,
  targetWidgetId,
  title,
  workingDir,
}: CreateSplitTerminalWidgetInput) {
  return requestRuntimeJSON<CreateTerminalTabResult>('/api/v1/workspace/widgets/split', {
    body: JSON.stringify({
      connection_id: connectionId,
      direction,
      tab_id: tabId,
      target_widget_id: targetWidgetId,
      title,
      working_dir: workingDir,
    }),
    method: 'POST',
  })
}

export async function closeTerminalTab(tabID: string) {
  return requestRuntimeJSON<CloseTerminalTabResult>(`/api/v1/workspace/tabs/${encodeURIComponent(tabID)}`, {
    method: 'DELETE',
  })
}

export async function sendTerminalInput(widgetID: string, text: string, appendNewline: boolean) {
  return requestRuntimeJSON<TerminalInputResult>(buildTerminalPath(widgetID, '/input'), {
    body: JSON.stringify({
      text,
      append_newline: appendNewline,
    }),
    method: 'POST',
  })
}

export async function restartTerminal(widgetID: string) {
  const payload = await requestRuntimeJSON<TerminalRestartResponse>(buildTerminalPath(widgetID, '/restart'), {
    method: 'POST',
  })

  return payload.state
}

export async function interruptTerminal(widgetID: string) {
  const payload = await requestRuntimeJSON<TerminalInterruptResponse>(
    buildTerminalPath(widgetID, '/interrupt'),
    {
      method: 'POST',
    },
  )

  return payload.state
}

export async function connectTerminalStream(
  widgetID: string,
  { from, onError, onOutput, signal }: TerminalStreamOptions,
): Promise<TerminalStreamConnection> {
  const runtimeContext = await resolveRuntimeContext()
  const streamAbortController = new AbortController()
  const detachAbortSignal = attachAbortSignal(signal, streamAbortController)

  const done = (async () => {
    try {
      const response = await fetch(
        `${runtimeContext.baseUrl}${buildTerminalPath(widgetID, '/stream', from)}`,
        {
          headers: {
            Authorization: `Bearer ${runtimeContext.authToken}`,
          },
          signal: streamAbortController.signal,
        },
      )

      if (!response.ok) {
        let errorPayload: APIErrorEnvelope | null = null

        try {
          errorPayload = (await response.json()) as APIErrorEnvelope
        } catch {
          errorPayload = null
        }

        throw new TerminalAPIError(
          response.status,
          errorPayload?.error?.code ?? 'terminal_stream_failed',
          errorPayload?.error?.message ?? `Terminal stream failed (${response.status})`,
        )
      }

      if (!response.body) {
        throw new Error('Terminal stream response did not provide a readable body')
      }

      await consumeTerminalStream(response.body, onOutput)
    } catch (error) {
      if (!isAbortError(error)) {
        onError?.(error)
        throw error
      }
    } finally {
      detachAbortSignal()
    }
  })()

  return {
    close: () => streamAbortController.abort(),
    done,
  }
}
