import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'

import {
  connectTerminalStream,
  fetchTerminalSnapshot,
  sendTerminalInput,
  type TerminalOutputChunk,
  type TerminalSnapshot,
} from '@/features/terminal/api/client'
import type {
  TerminalDisplayConnectionKind,
  TerminalDisplaySessionState,
  TerminalSessionSeed,
  TerminalSessionView,
} from '@/features/terminal/model/types'

type TerminalSessionRecordState = {
  error: string | null
  isLoading: boolean
  snapshot: TerminalSnapshot | null
}

type TerminalSessionRecord = {
  listeners: Set<() => void>
  loadPromise: Promise<void> | null
  retainers: number
  state: TerminalSessionRecordState
  streamClose: (() => void) | null
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
      isLoading: false,
      snapshot: null,
    },
    streamClose: null,
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

function toTerminalErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
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

  return shellSegments.at(-1) ?? trimmedShell
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
): TerminalSessionView {
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
    cwd: getTerminalWorkingLabel(seed, runtimeState),
    shellLabel: formatShellLabel(runtimeState?.shell, runtimeState?.connection_kind),
    connectionKind: mapConnectionKind(runtimeState?.connection_kind),
    sessionState,
    canSendInput: runtimeState?.can_send_input ?? false,
    canInterrupt: runtimeState?.can_interrupt ?? false,
    isLoading: state.isLoading,
    error,
    statusDetail: error ?? runtimeState?.status_detail?.trim() ?? null,
    outputChunks: state.snapshot?.chunks ?? [],
    runtimeState,
  }
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
      chunks: [...snapshot.chunks, chunk],
      next_seq: Math.max(snapshot.next_seq, chunk.seq + 1),
    },
  }
}

async function ensureTerminalSession(record: TerminalSessionRecord) {
  if (record.loadPromise) {
    return record.loadPromise
  }

  record.state = {
    ...record.state,
    isLoading: true,
    error: null,
  }
  notifyTerminalSessionRecord(record)

  record.loadPromise = (async () => {
    try {
      const snapshot = await fetchTerminalSnapshot(record.widgetId)

      record.state = {
        error: null,
        isLoading: false,
        snapshot,
      }
      notifyTerminalSessionRecord(record)

      const streamConnection = await connectTerminalStream(record.widgetId, {
        from: snapshot.next_seq,
        onError: (error) => {
          const nextRecord = terminalSessionRecords.get(record.widgetId)

          if (!nextRecord) {
            return
          }

          nextRecord.state = {
            ...nextRecord.state,
            error: toTerminalErrorMessage(error, `Unable to follow terminal stream for ${record.widgetId}.`),
          }
          notifyTerminalSessionRecord(nextRecord)
        },
        onOutput: (chunk) => {
          const nextRecord = terminalSessionRecords.get(record.widgetId)

          if (!nextRecord) {
            return
          }

          appendTerminalChunk(nextRecord, chunk)
          notifyTerminalSessionRecord(nextRecord)
        },
      })

      record.streamClose = streamConnection.close
      void streamConnection.done.catch(() => {})
    } catch (error) {
      record.state = {
        ...record.state,
        error: toTerminalErrorMessage(error, `Unable to load terminal snapshot for ${record.widgetId}.`),
        isLoading: false,
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

  record.streamClose?.()
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

  return {
    ...sessionView,
    sendInputChunk,
  }
}

export function resetTerminalSessionStoreForTests() {
  for (const record of terminalSessionRecords.values()) {
    record.streamClose?.()
  }

  terminalSessionRecords.clear()
}
