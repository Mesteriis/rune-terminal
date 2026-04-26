import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'

import {
  closeTerminalSession,
  connectTerminalStream,
  createTerminalSession,
  fetchTerminalSnapshot,
  interruptTerminal,
  restartTerminal,
  sendTerminalInput,
  setActiveTerminalSession,
  type TerminalOutputChunk,
  type TerminalSnapshot,
} from '@/features/terminal/api/client'
import type {
  TerminalDisplayConnectionKind,
  TerminalSessionListEntry,
  TerminalDisplaySessionState,
  TerminalSessionSeed,
  TerminalSessionView,
} from '@/features/terminal/model/types'

type TerminalSessionStaticView = Omit<
  TerminalSessionView,
  | 'closeSession'
  | 'createSession'
  | 'focusSession'
  | 'interruptSession'
  | 'recoverSession'
  | 'restartSession'
  | 'sendInputChunk'
>

type TerminalSessionRecordState = {
  error: string | null
  isCreatingSession: boolean
  isRecoveringStream: boolean
  isInterrupting: boolean
  isLoading: boolean
  isRestarting: boolean
  snapshot: TerminalSnapshot | null
  streamRetryCount: number
}

type TerminalSessionRecord = {
  listeners: Set<() => void>
  loadPromise: Promise<void> | null
  retainers: number
  state: TerminalSessionRecordState
  streamClose: (() => void) | null
  streamReconnectTimer: ReturnType<typeof globalThis.setTimeout> | null
  widgetId: string
}

const terminalSessionRecords = new Map<string, TerminalSessionRecord>()

function createTerminalSessionRecord(widgetId: string): TerminalSessionRecord {
  return {
    listeners: new Set(),
    loadPromise: null,
    retainers: 0,
    state: {
      error: null,
      isCreatingSession: false,
      isRecoveringStream: false,
      isInterrupting: false,
      isLoading: false,
      isRestarting: false,
      snapshot: null,
      streamRetryCount: 0,
    },
    streamClose: null,
    streamReconnectTimer: null,
    widgetId,
  }
}

function getTerminalSessionRecord(widgetId: string) {
  const existingRecord = terminalSessionRecords.get(widgetId)

  if (existingRecord) {
    return existingRecord
  }

  const nextRecord = createTerminalSessionRecord(widgetId)
  terminalSessionRecords.set(widgetId, nextRecord)
  return nextRecord
}

function notifyTerminalSessionRecord(record: TerminalSessionRecord) {
  for (const listener of record.listeners) {
    listener()
  }
}

function isActiveTerminalSessionRecord(record: TerminalSessionRecord) {
  return terminalSessionRecords.get(record.widgetId) === record
}

function toTerminalErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}

function shouldAutoRecoverStream(snapshot: TerminalSnapshot | null) {
  const status = snapshot?.state.status
  return status === 'running' || status === 'starting'
}

function mapConnectionKind(connectionKind?: string): TerminalDisplayConnectionKind {
  return connectionKind === 'ssh' ? 'ssh' : 'local'
}

function formatShellLabel(shell: string | undefined, connectionKind: string | undefined) {
  const trimmedShell = shell?.trim() ?? ''

  if (trimmedShell === '') {
    return connectionKind === 'ssh' ? 'ssh' : 'shell'
  }

  const shellSegments = trimmedShell.split(/[\\/]/).filter(Boolean)
  const lastShellSegment = shellSegments[shellSegments.length - 1]

  return lastShellSegment ?? trimmedShell
}

function mapSessionState(
  status: string | undefined,
  isLoading: boolean,
  hasSnapshot: boolean,
): TerminalDisplaySessionState {
  if (!hasSnapshot) {
    return isLoading ? 'starting' : 'failed'
  }

  if (status === 'starting') {
    return 'starting'
  }

  if (status === 'exited') {
    return 'exited'
  }

  if (status === 'failed') {
    return 'failed'
  }

  if (status === 'disconnected') {
    return 'disconnected'
  }

  return 'running'
}

function getTerminalWorkingLabel(seed: TerminalSessionSeed, state: TerminalSnapshot['state'] | null) {
  if (!state) {
    return seed.title
  }

  const workingDir = state.working_dir?.trim()

  if (workingDir) {
    return workingDir
  }

  if (state.connection_kind === 'ssh') {
    return state.connection_name?.trim() || seed.title
  }

  return seed.title
}

function buildTerminalSessionView(
  seed: TerminalSessionSeed,
  state: TerminalSessionRecordState,
): TerminalSessionStaticView {
  const runtimeState = state.snapshot?.state ?? null
  const error = state.error
  const hasSnapshot = runtimeState !== null
  const sessionState =
    error && !hasSnapshot ? 'failed' : mapSessionState(runtimeState?.status, state.isLoading, hasSnapshot)

  return {
    runtimeWidgetId: seed.runtimeWidgetId,
    sessionKey: runtimeState
      ? `${runtimeState.session_id}:${runtimeState.started_at}`
      : `${seed.runtimeWidgetId}:pending`,
    activeSessionId: state.snapshot?.active_session_id ?? runtimeState?.session_id ?? null,
    cwd: getTerminalWorkingLabel(seed, runtimeState),
    shellLabel: formatShellLabel(runtimeState?.shell, runtimeState?.connection_kind),
    connectionKind: mapConnectionKind(runtimeState?.connection_kind),
    sessionState,
    sessions: buildTerminalSessionList(seed, state.snapshot),
    canSendInput: runtimeState?.can_send_input ?? false,
    canInterrupt: runtimeState?.can_interrupt ?? false,
    isCreatingSession: state.isCreatingSession,
    isRecoveringStream: state.isRecoveringStream,
    isLoading: state.isLoading,
    isInterrupting: state.isInterrupting,
    isRestarting: state.isRestarting,
    error,
    statusDetail: state.isRecoveringStream
      ? 'Reconnecting live terminal stream…'
      : (error ?? runtimeState?.status_detail?.trim() ?? null),
    outputChunks: state.snapshot?.chunks ?? [],
    runtimeState,
  }
}

function buildTerminalSessionList(
  seed: TerminalSessionSeed,
  snapshot: TerminalSnapshot | null,
): TerminalSessionListEntry[] {
  if (!snapshot?.sessions?.length) {
    return []
  }

  const activeSessionID = snapshot.active_session_id ?? snapshot.state.session_id

  return snapshot.sessions.map((runtimeState) => ({
    sessionId: runtimeState.session_id,
    shellLabel: formatShellLabel(runtimeState.shell, runtimeState.connection_kind),
    connectionKind: mapConnectionKind(runtimeState.connection_kind),
    connectionName: runtimeState.connection_name?.trim() || null,
    remoteLaunchMode: runtimeState.remote_launch_mode?.trim() || null,
    remoteSessionName: runtimeState.remote_session_name?.trim() || null,
    sessionState: mapSessionState(runtimeState.status, false, true),
    statusDetail: runtimeState.status_detail?.trim() ?? null,
    cwd: getTerminalWorkingLabel(seed, runtimeState),
    isActive: runtimeState.session_id === activeSessionID,
    runtimeState,
  }))
}

function appendTerminalChunk(record: TerminalSessionRecord, chunk: TerminalOutputChunk) {
  const snapshot = record.state.snapshot

  if (!snapshot) {
    return
  }

  record.state = {
    ...record.state,
    snapshot: {
      ...snapshot,
      state: {
        ...snapshot.state,
        last_output_at: chunk.timestamp,
      },
      chunks: [...(snapshot.chunks ?? []), chunk],
      next_seq: Math.max(snapshot.next_seq, chunk.seq + 1),
    },
  }
}

function clearTerminalStreamReconnectTimer(record: TerminalSessionRecord) {
  if (record.streamReconnectTimer !== null) {
    globalThis.clearTimeout(record.streamReconnectTimer)
    record.streamReconnectTimer = null
  }
}

function clearTerminalStreamConnection(record: TerminalSessionRecord) {
  record.streamClose?.()
  record.streamClose = null
}

async function reloadTerminalSessionRecord(
  record: TerminalSessionRecord,
  options?: {
    preserveRecoveryState?: boolean
    silent?: boolean
  },
) {
  clearTerminalStreamReconnectTimer(record)
  clearTerminalStreamConnection(record)

  if (!options?.silent) {
    record.state = {
      ...record.state,
      error: null,
      isLoading: true,
    }
    notifyTerminalSessionRecord(record)
  }

  try {
    const snapshot = await fetchTerminalSnapshot(record.widgetId)

    if (!isActiveTerminalSessionRecord(record)) {
      return
    }

    record.state = {
      ...record.state,
      error: null,
      isLoading: false,
      isRecoveringStream: options?.preserveRecoveryState ? record.state.isRecoveringStream : false,
      snapshot,
      streamRetryCount: options?.preserveRecoveryState ? record.state.streamRetryCount : 0,
    }
    notifyTerminalSessionRecord(record)

    await attachTerminalStream(record, snapshot.next_seq)

    if (!isActiveTerminalSessionRecord(record)) {
      return
    }

    if (record.state.isRecoveringStream || record.state.streamRetryCount > 0) {
      record.state = {
        ...record.state,
        isRecoveringStream: false,
        streamRetryCount: 0,
      }
      notifyTerminalSessionRecord(record)
    }
  } catch (error) {
    if (!isActiveTerminalSessionRecord(record)) {
      return
    }

    if (options?.preserveRecoveryState && shouldAutoRecoverStream(record.state.snapshot)) {
      scheduleTerminalStreamReconnect(record, error)
      return
    }

    record.state = {
      ...record.state,
      error: toTerminalErrorMessage(error, `Unable to load terminal snapshot for ${record.widgetId}.`),
      isLoading: false,
    }
    notifyTerminalSessionRecord(record)
  }
}

function scheduleTerminalStreamReconnect(record: TerminalSessionRecord, error: unknown) {
  if (!isActiveTerminalSessionRecord(record) || record.retainers <= 0) {
    return
  }

  if (!shouldAutoRecoverStream(record.state.snapshot)) {
    record.state = {
      ...record.state,
      error: toTerminalErrorMessage(error, `Unable to follow terminal stream for ${record.widgetId}.`),
      isRecoveringStream: false,
    }
    notifyTerminalSessionRecord(record)
    return
  }

  clearTerminalStreamReconnectTimer(record)
  const nextRetryCount = record.state.streamRetryCount + 1
  const reconnectDelay = Math.min(4000, 500 * nextRetryCount)

  record.state = {
    ...record.state,
    error: null,
    isRecoveringStream: true,
    streamRetryCount: nextRetryCount,
  }
  notifyTerminalSessionRecord(record)

  record.streamReconnectTimer = globalThis.setTimeout(() => {
    record.streamReconnectTimer = null
    if (!isActiveTerminalSessionRecord(record) || record.retainers <= 0) {
      return
    }
    void reloadTerminalSessionRecord(record, {
      preserveRecoveryState: true,
      silent: true,
    })
  }, reconnectDelay)
}

async function attachTerminalStream(record: TerminalSessionRecord, nextSeq: number) {
  let closedByClient = false
  const streamConnection = await connectTerminalStream(record.widgetId, {
    from: nextSeq,
    onOutput: (chunk) => {
      const nextRecord = terminalSessionRecords.get(record.widgetId)

      if (!nextRecord) {
        return
      }

      appendTerminalChunk(nextRecord, chunk)
      if (nextRecord.state.isRecoveringStream || nextRecord.state.streamRetryCount > 0) {
        nextRecord.state = {
          ...nextRecord.state,
          error: null,
          isRecoveringStream: false,
          streamRetryCount: 0,
        }
      }
      notifyTerminalSessionRecord(nextRecord)
    },
  })

  if (!isActiveTerminalSessionRecord(record)) {
    streamConnection.close()
    return
  }

  record.streamClose = () => {
    closedByClient = true
    streamConnection.close()
  }
  void streamConnection.done
    .then(() => {
      if (closedByClient) {
        return
      }
      const nextRecord = terminalSessionRecords.get(record.widgetId)
      if (!nextRecord) {
        return
      }
      scheduleTerminalStreamReconnect(nextRecord, new Error('Terminal stream ended unexpectedly.'))
    })
    .catch((error) => {
      if (closedByClient) {
        return
      }
      const nextRecord = terminalSessionRecords.get(record.widgetId)
      if (!nextRecord) {
        return
      }
      scheduleTerminalStreamReconnect(nextRecord, error)
    })
}

async function ensureTerminalSession(record: TerminalSessionRecord) {
  if (record.loadPromise) {
    return record.loadPromise
  }

  record.state = {
    ...record.state,
    isLoading: true,
    isCreatingSession: false,
    isInterrupting: false,
    isRestarting: false,
    error: null,
  }
  notifyTerminalSessionRecord(record)

  record.loadPromise = (async () => {
    try {
      const snapshot = await fetchTerminalSnapshot(record.widgetId)

      if (!isActiveTerminalSessionRecord(record)) {
        return
      }

      record.state = {
        error: null,
        isCreatingSession: false,
        isRecoveringStream: false,
        isInterrupting: false,
        isLoading: false,
        isRestarting: false,
        snapshot,
        streamRetryCount: 0,
      }
      notifyTerminalSessionRecord(record)
      await attachTerminalStream(record, snapshot.next_seq)
    } catch (error) {
      if (!isActiveTerminalSessionRecord(record)) {
        return
      }

      record.state = {
        ...record.state,
        error: toTerminalErrorMessage(error, `Unable to load terminal snapshot for ${record.widgetId}.`),
        isCreatingSession: false,
        isInterrupting: false,
        isRecoveringStream: false,
        isLoading: false,
        isRestarting: false,
      }
      notifyTerminalSessionRecord(record)
    }
  })().finally(() => {
    record.loadPromise = null
  })

  return record.loadPromise
}

function retainTerminalSession(widgetId: string) {
  const record = getTerminalSessionRecord(widgetId)
  record.retainers += 1
  return record
}

function releaseTerminalSession(widgetId: string) {
  const record = terminalSessionRecords.get(widgetId)

  if (!record) {
    return
  }

  record.retainers = Math.max(0, record.retainers - 1)

  if (record.retainers > 0) {
    return
  }

  clearTerminalStreamReconnectTimer(record)
  clearTerminalStreamConnection(record)
  terminalSessionRecords.delete(widgetId)
}

export function useTerminalSession(seed: TerminalSessionSeed) {
  const subscribe = useMemo(
    () => (listener: () => void) => {
      const record = getTerminalSessionRecord(seed.runtimeWidgetId)
      record.listeners.add(listener)

      return () => {
        record.listeners.delete(listener)
      }
    },
    [seed.runtimeWidgetId],
  )

  const getSnapshot = useMemo(
    () => () => getTerminalSessionRecord(seed.runtimeWidgetId).state,
    [seed.runtimeWidgetId],
  )

  const recordState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const sessionView = useMemo(
    () => buildTerminalSessionView(seed, recordState),
    [recordState, seed.runtimeWidgetId, seed.title],
  )

  useEffect(() => {
    const record = retainTerminalSession(seed.runtimeWidgetId)
    void ensureTerminalSession(record)

    return () => {
      releaseTerminalSession(seed.runtimeWidgetId)
    }
  }, [seed.runtimeWidgetId])

  const sendInputChunk = useCallback(
    async (text: string) => {
      if (text === '') {
        return
      }

      try {
        await sendTerminalInput(seed.runtimeWidgetId, text, false)

        const record = terminalSessionRecords.get(seed.runtimeWidgetId)

        if (!record || record.state.snapshot === null || record.state.error === null) {
          return
        }

        record.state = {
          ...record.state,
          error: null,
        }
        notifyTerminalSessionRecord(record)
      } catch (error) {
        const record = getTerminalSessionRecord(seed.runtimeWidgetId)

        record.state = {
          ...record.state,
          error: toTerminalErrorMessage(error, `Unable to send terminal input for ${seed.runtimeWidgetId}.`),
        }
        notifyTerminalSessionRecord(record)
      }
    },
    [seed.runtimeWidgetId],
  )

  const restartSession = useCallback(async () => {
    const record = getTerminalSessionRecord(seed.runtimeWidgetId)

    if (record.state.isInterrupting || record.state.isRestarting) {
      return
    }

    record.state = {
      ...record.state,
      error: null,
      isCreatingSession: false,
      isInterrupting: false,
      isRestarting: true,
    }
    notifyTerminalSessionRecord(record)

    try {
      await restartTerminal(seed.runtimeWidgetId)
      await reloadTerminalSessionRecord(record)
      if (!isActiveTerminalSessionRecord(record)) {
        return
      }
      record.state = {
        ...record.state,
        isInterrupting: false,
        isRestarting: false,
      }
      notifyTerminalSessionRecord(record)
    } catch (error) {
      if (!isActiveTerminalSessionRecord(record)) {
        return
      }

      record.state = {
        ...record.state,
        error: toTerminalErrorMessage(
          error,
          `Unable to restart terminal session for ${seed.runtimeWidgetId}.`,
        ),
        isCreatingSession: false,
        isInterrupting: false,
        isRestarting: false,
      }
      notifyTerminalSessionRecord(record)
    }
  }, [seed.runtimeWidgetId])

  const recoverSession = useCallback(async () => {
    const record = getTerminalSessionRecord(seed.runtimeWidgetId)

    if (
      record.state.isCreatingSession ||
      record.state.isInterrupting ||
      record.state.isLoading ||
      record.state.isRestarting
    ) {
      return
    }

    const runtimeStatus = record.state.snapshot?.state.status
    if (runtimeStatus === 'exited' || runtimeStatus === 'failed' || runtimeStatus === 'disconnected') {
      await restartSession()
      return
    }

    record.state = {
      ...record.state,
      error: null,
      isRecoveringStream: true,
      streamRetryCount: 0,
    }
    notifyTerminalSessionRecord(record)

    await reloadTerminalSessionRecord(record, {
      preserveRecoveryState: true,
      silent: true,
    })
  }, [restartSession, seed.runtimeWidgetId])

  const interruptSession = useCallback(async () => {
    const record = getTerminalSessionRecord(seed.runtimeWidgetId)

    if (
      record.state.isInterrupting ||
      record.state.isRestarting ||
      record.state.snapshot?.state.can_interrupt !== true
    ) {
      return
    }

    record.state = {
      ...record.state,
      error: null,
      isCreatingSession: false,
      isInterrupting: true,
    }
    notifyTerminalSessionRecord(record)

    try {
      const nextState = await interruptTerminal(seed.runtimeWidgetId)
      const nextRecord = terminalSessionRecords.get(seed.runtimeWidgetId)

      if (!nextRecord || !isActiveTerminalSessionRecord(nextRecord)) {
        return
      }

      nextRecord.state = {
        ...nextRecord.state,
        error: null,
        isCreatingSession: false,
        isInterrupting: false,
        snapshot: nextRecord.state.snapshot
          ? {
              ...nextRecord.state.snapshot,
              state: nextState,
            }
          : nextRecord.state.snapshot,
      }
      notifyTerminalSessionRecord(nextRecord)
    } catch (error) {
      const nextRecord = terminalSessionRecords.get(seed.runtimeWidgetId)

      if (!nextRecord || !isActiveTerminalSessionRecord(nextRecord)) {
        return
      }

      nextRecord.state = {
        ...nextRecord.state,
        error: toTerminalErrorMessage(
          error,
          `Unable to interrupt terminal session for ${seed.runtimeWidgetId}.`,
        ),
        isCreatingSession: false,
        isInterrupting: false,
      }
      notifyTerminalSessionRecord(nextRecord)
    }
  }, [seed.runtimeWidgetId])

  const createSessionForWidget = useCallback(async () => {
    const record = getTerminalSessionRecord(seed.runtimeWidgetId)
    if (record.state.isCreatingSession || record.state.isInterrupting || record.state.isRestarting) {
      return
    }

    record.state = {
      ...record.state,
      error: null,
      isCreatingSession: true,
    }
    notifyTerminalSessionRecord(record)

    try {
      await createTerminalSession(seed.runtimeWidgetId)
      await reloadTerminalSessionRecord(record)
      if (!isActiveTerminalSessionRecord(record)) {
        return
      }
      record.state = {
        ...record.state,
        isCreatingSession: false,
      }
      notifyTerminalSessionRecord(record)
    } catch (error) {
      if (!isActiveTerminalSessionRecord(record)) {
        return
      }
      record.state = {
        ...record.state,
        error: toTerminalErrorMessage(
          error,
          `Unable to create a terminal session for ${seed.runtimeWidgetId}.`,
        ),
        isCreatingSession: false,
      }
      notifyTerminalSessionRecord(record)
    }
  }, [seed.runtimeWidgetId])

  const focusSession = useCallback(
    async (sessionID: string) => {
      const record = getTerminalSessionRecord(seed.runtimeWidgetId)
      const activeSessionID =
        record.state.snapshot?.active_session_id ?? record.state.snapshot?.state.session_id

      if (
        sessionID.trim() === '' ||
        sessionID === activeSessionID ||
        record.state.isCreatingSession ||
        record.state.isInterrupting ||
        record.state.isRestarting
      ) {
        return
      }

      record.state = {
        ...record.state,
        error: null,
        isLoading: true,
      }
      notifyTerminalSessionRecord(record)

      try {
        await setActiveTerminalSession(seed.runtimeWidgetId, sessionID)
        await reloadTerminalSessionRecord(record)
      } catch (error) {
        if (!isActiveTerminalSessionRecord(record)) {
          return
        }
        record.state = {
          ...record.state,
          error: toTerminalErrorMessage(error, `Unable to focus terminal session ${sessionID}.`),
          isLoading: false,
        }
        notifyTerminalSessionRecord(record)
      }
    },
    [seed.runtimeWidgetId],
  )

  const closeSessionForWidget = useCallback(
    async (sessionID: string) => {
      const record = getTerminalSessionRecord(seed.runtimeWidgetId)
      const sessionCount = record.state.snapshot?.sessions?.length ?? 0

      if (
        sessionID.trim() === '' ||
        sessionCount <= 1 ||
        record.state.isCreatingSession ||
        record.state.isInterrupting ||
        record.state.isRestarting
      ) {
        return
      }

      record.state = {
        ...record.state,
        error: null,
        isLoading: true,
      }
      notifyTerminalSessionRecord(record)

      try {
        await closeTerminalSession(seed.runtimeWidgetId, sessionID)
        await reloadTerminalSessionRecord(record)
      } catch (error) {
        if (!isActiveTerminalSessionRecord(record)) {
          return
        }
        record.state = {
          ...record.state,
          error: toTerminalErrorMessage(error, `Unable to close terminal session ${sessionID}.`),
          isLoading: false,
        }
        notifyTerminalSessionRecord(record)
      }
    },
    [seed.runtimeWidgetId],
  )

  return {
    ...sessionView,
    closeSession: closeSessionForWidget,
    createSession: createSessionForWidget,
    focusSession,
    interruptSession,
    recoverSession,
    sendInputChunk,
    restartSession,
  }
}

export function resetTerminalSessionStoreForTests() {
  for (const record of terminalSessionRecords.values()) {
    clearTerminalStreamReconnectTimer(record)
    clearTerminalStreamConnection(record)
  }

  terminalSessionRecords.clear()
}
