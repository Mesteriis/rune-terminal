import { resolveRuntimeContext, type RuntimeContext } from '@/shared/api/runtime'
import { z } from 'zod'

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
  remote_launch_mode?: string
  remote_session_name?: string
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

export type TerminalLatestCommand = {
  widget_id: string
  session_id: string
  command: string
  from_seq: number
  submitted_at: string
  output_excerpt?: string
  status: TerminalRuntimeStatus
  status_detail?: string
  exit_code?: number
  command_audit_event_id?: string
  execution_block_id?: string
  explain_state?: string
  explain_summary?: string
}

export type TerminalSessionCatalogEntry = {
  workspace_id: string
  workspace_name: string
  tab_id?: string
  tab_title?: string
  widget_id: string
  widget_title: string
  session_id: string
  connection_id?: string
  connection_kind?: string
  connection_name?: string
  remote_launch_mode?: string
  remote_session_name?: string
  shell: string
  status: TerminalRuntimeStatus
  status_detail?: string
  working_dir?: string
  is_active_workspace: boolean
  is_active_tab: boolean
  is_active_widget: boolean
  is_active_session: boolean
}

export type TerminalSessionCatalog = {
  active_workspace_id?: string
  sessions: TerminalSessionCatalogEntry[]
}

export type TerminalShellOption = {
  path: string
  name: string
  default?: boolean
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

type TerminalRestartOptions = {
  shell?: string
}

type TerminalShellsResponse = {
  shells?: TerminalShellOption[]
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

const terminalRuntimeStateSchema = z
  .object({
    widget_id: z.string(),
    session_id: z.string(),
    shell: z.string(),
    restored: z.boolean().optional(),
    status_detail: z.string().optional(),
    connection_id: z.string().optional(),
    connection_name: z.string().optional(),
    connection_kind: z.string().optional(),
    remote_launch_mode: z.string().optional(),
    remote_session_name: z.string().optional(),
    pid: z.number(),
    status: z.string(),
    started_at: z.string(),
    last_output_at: z.string().optional(),
    exit_code: z.number().optional(),
    can_send_input: z.boolean(),
    can_interrupt: z.boolean(),
    working_dir: z.string().optional(),
  })
  .passthrough()

const terminalOutputChunkSchema = z
  .object({
    seq: z.number(),
    data: z.string(),
    timestamp: z.string(),
  })
  .passthrough()

const terminalSnapshotSchema = z
  .object({
    state: terminalRuntimeStateSchema,
    chunks: z.array(terminalOutputChunkSchema).nullable().optional(),
    next_seq: z.number(),
    active_session_id: z.string().optional(),
    sessions: z.array(terminalRuntimeStateSchema).optional(),
  })
  .passthrough()

const terminalDiagnosticsSchema = z
  .object({
    widget_id: z.string(),
    session_state: z.string(),
    status_detail: z.string().optional(),
    issue_summary: z.string().optional(),
    output_excerpt: z.string().optional(),
  })
  .passthrough()

const terminalLatestCommandSchema = z
  .object({
    widget_id: z.string(),
    session_id: z.string(),
    command: z.string(),
    from_seq: z.number(),
    submitted_at: z.string(),
    output_excerpt: z.string().optional(),
    status: z.string(),
    status_detail: z.string().optional(),
    exit_code: z.number().optional(),
    command_audit_event_id: z.string().optional(),
    execution_block_id: z.string().optional(),
    explain_state: z.string().optional(),
    explain_summary: z.string().optional(),
  })
  .passthrough()

const terminalSessionCatalogEntrySchema = z
  .object({
    workspace_id: z.string(),
    workspace_name: z.string(),
    tab_id: z.string().optional(),
    tab_title: z.string().optional(),
    widget_id: z.string(),
    widget_title: z.string(),
    session_id: z.string(),
    connection_id: z.string().optional(),
    connection_kind: z.string().optional(),
    connection_name: z.string().optional(),
    remote_launch_mode: z.string().optional(),
    remote_session_name: z.string().optional(),
    shell: z.string(),
    status: z.string(),
    status_detail: z.string().optional(),
    working_dir: z.string().optional(),
    is_active_workspace: z.boolean(),
    is_active_tab: z.boolean(),
    is_active_widget: z.boolean(),
    is_active_session: z.boolean(),
  })
  .passthrough()

const terminalSessionCatalogSchema = z
  .object({
    active_workspace_id: z.string().optional(),
    sessions: z.array(terminalSessionCatalogEntrySchema).optional(),
  })
  .passthrough()

const terminalShellOptionSchema = z
  .object({
    path: z.string(),
    name: z.string(),
    default: z.boolean().optional(),
  })
  .passthrough()

const terminalShellsResponseSchema = z
  .object({
    shells: z.array(terminalShellOptionSchema).optional(),
  })
  .passthrough()

const terminalInputResultSchema = z
  .object({
    widget_id: z.string(),
    bytes_sent: z.number(),
    append_newline: z.boolean(),
  })
  .passthrough()

const terminalStateEnvelopeSchema = z
  .object({
    state: terminalRuntimeStateSchema,
  })
  .passthrough()

function parseWithSchema<T>(schema: z.ZodSchema<T>, payload: unknown, message: string): T {
  const result = schema.safeParse(payload)

  if (!result.success) {
    throw new Error(message)
  }

  return result.data
}

function normalizeTerminalChunks(chunks: unknown): TerminalOutputChunk[] {
  if (!Array.isArray(chunks)) {
    return []
  }

  return chunks.map((chunk, index) =>
    parseWithSchema(terminalOutputChunkSchema, chunk, `Invalid terminal output chunk at index ${index}.`),
  )
}

function normalizeTerminalSessions(sessions: unknown): TerminalRuntimeState[] {
  if (!Array.isArray(sessions)) {
    return []
  }

  return sessions.map((session, index) =>
    parseWithSchema(terminalRuntimeStateSchema, session, `Invalid terminal session state at index ${index}.`),
  )
}

function normalizeTerminalSnapshot(snapshot: unknown): TerminalSnapshot {
  const parsedSnapshot = parseWithSchema(
    terminalSnapshotSchema,
    snapshot,
    'Invalid terminal snapshot payload.',
  )

  return {
    ...parsedSnapshot,
    sessions: normalizeTerminalSessions(parsedSnapshot.sessions),
    chunks: normalizeTerminalChunks(parsedSnapshot.chunks),
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

function parseTerminalOutputChunk(raw: string) {
  return parseWithSchema(terminalOutputChunkSchema, JSON.parse(raw), 'Invalid terminal output chunk payload.')
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
        onOutput(parseTerminalOutputChunk(parsedEvent.data))
      }

      boundaryIndex = normalizedBuffer.indexOf('\n\n')
    }

    buffer = flushRemainder ? '' : normalizedBuffer

    if (flushRemainder && normalizedBuffer.trim() !== '') {
      const parsedEvent = parseEventBlock(normalizedBuffer)

      if (parsedEvent?.event === 'output') {
        onOutput(parseTerminalOutputChunk(parsedEvent.data))
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

export async function fetchTerminalSnapshot(widgetID: string, from?: number, signal?: AbortSignal) {
  const snapshot = await requestRuntimeJSON<TerminalSnapshot>(buildTerminalPath(widgetID, '', from), {
    signal,
  })
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

export async function closeTerminalSession(widgetID: string, sessionID: string) {
  const snapshot = await requestRuntimeJSON<TerminalSnapshot>(
    buildTerminalPath(widgetID, `/sessions/${encodeURIComponent(sessionID)}`),
    {
      method: 'DELETE',
    },
  )
  return normalizeTerminalSnapshot(snapshot)
}

export async function fetchTerminalDiagnostics(widgetID: string) {
  return parseWithSchema(
    terminalDiagnosticsSchema,
    await requestRuntimeJSON<TerminalDiagnostics>(buildTerminalPath(widgetID, '/diagnostics')),
    'Invalid terminal diagnostics payload.',
  )
}

export async function fetchTerminalLatestCommand(widgetID: string) {
  return parseWithSchema(
    terminalLatestCommandSchema,
    await requestRuntimeJSON<TerminalLatestCommand>(buildTerminalPath(widgetID, '/commands/latest')),
    'Invalid terminal latest-command payload.',
  )
}

export async function fetchTerminalSessionCatalog() {
  const payload = parseWithSchema(
    terminalSessionCatalogSchema,
    await requestRuntimeJSON<TerminalSessionCatalog>('/api/v1/terminal/sessions'),
    'Invalid terminal session catalog payload.',
  )

  return {
    active_workspace_id: payload.active_workspace_id,
    sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
  } satisfies TerminalSessionCatalog
}

export async function fetchTerminalShells() {
  const payload = parseWithSchema(
    terminalShellsResponseSchema,
    await requestRuntimeJSON<TerminalShellsResponse>('/api/v1/terminal/shells'),
    'Invalid terminal shells payload.',
  )

  return Array.isArray(payload.shells) ? payload.shells : []
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
  return parseWithSchema(
    terminalInputResultSchema,
    await requestRuntimeJSON<TerminalInputResult>(buildTerminalPath(widgetID, '/input'), {
      body: JSON.stringify({
        text,
        append_newline: appendNewline,
      }),
      method: 'POST',
    }),
    'Invalid terminal input result payload.',
  )
}

export async function restartTerminal(widgetID: string, options?: TerminalRestartOptions) {
  const body =
    options?.shell && options.shell.trim() !== ''
      ? JSON.stringify({
          shell: options.shell,
        })
      : undefined
  const payload = parseWithSchema(
    terminalStateEnvelopeSchema,
    await requestRuntimeJSON<TerminalRestartResponse>(
      buildTerminalPath(widgetID, '/restart'),
      body
        ? {
            body,
            method: 'POST',
          }
        : {
            method: 'POST',
          },
    ),
    'Invalid terminal restart payload.',
  )

  return payload.state
}

export async function interruptTerminal(widgetID: string) {
  const payload = parseWithSchema(
    terminalStateEnvelopeSchema,
    await requestRuntimeJSON<TerminalInterruptResponse>(buildTerminalPath(widgetID, '/interrupt'), {
      method: 'POST',
    }),
    'Invalid terminal interrupt payload.',
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
