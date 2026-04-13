import type { OutputChunk, TerminalSnapshot, TerminalState } from '../types'

export function normalizeTerminalSnapshot(
  snapshot: TerminalSnapshot | null | undefined,
  widgetID: string,
  fallbackState?: TerminalState | null,
  from = 0,
): TerminalSnapshot {
  const chunks = Array.isArray(snapshot?.chunks) ? snapshot.chunks.filter(isOutputChunk) : []
  const lastSeq = chunks[chunks.length - 1]?.seq ?? from

  return {
    state: normalizeTerminalState(snapshot?.state, widgetID, fallbackState),
    chunks,
    next_seq: typeof snapshot?.next_seq === 'number' && Number.isFinite(snapshot.next_seq)
      ? snapshot.next_seq
      : lastSeq + 1,
  }
}

function normalizeTerminalState(
  state: TerminalState | null | undefined,
  widgetID: string,
  fallbackState?: TerminalState | null,
): TerminalState {
  if (isTerminalState(state)) {
    return {
      ...state,
      widget_id: state.widget_id || widgetID,
      session_id: state.session_id || fallbackState?.session_id || widgetID,
      shell: state.shell || fallbackState?.shell || 'shell',
      status: state.status || fallbackState?.status || 'running',
      started_at: state.started_at || fallbackState?.started_at || new Date(0).toISOString(),
      can_send_input: Boolean(state.can_send_input),
      can_interrupt: Boolean(state.can_interrupt),
      pid: Number.isFinite(state.pid) ? state.pid : fallbackState?.pid ?? 0,
      working_dir: state.working_dir || fallbackState?.working_dir,
    }
  }

  return {
    widget_id: fallbackState?.widget_id || widgetID,
    session_id: fallbackState?.session_id || widgetID,
    shell: fallbackState?.shell || 'shell',
    pid: fallbackState?.pid ?? 0,
    status: fallbackState?.status || 'unknown',
    started_at: fallbackState?.started_at || new Date(0).toISOString(),
    last_output_at: fallbackState?.last_output_at,
    exit_code: fallbackState?.exit_code,
    can_send_input: Boolean(fallbackState?.can_send_input),
    can_interrupt: Boolean(fallbackState?.can_interrupt),
    working_dir: fallbackState?.working_dir,
  }
}

function isOutputChunk(value: unknown): value is OutputChunk {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as OutputChunk).seq === 'number' &&
    typeof (value as OutputChunk).data === 'string' &&
    typeof (value as OutputChunk).timestamp === 'string'
  )
}

function isTerminalState(value: unknown): value is TerminalState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as TerminalState).session_id === 'string' &&
    typeof (value as TerminalState).started_at === 'string'
  )
}
