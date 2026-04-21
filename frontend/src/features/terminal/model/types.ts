import type { TerminalOutputChunk, TerminalRuntimeState } from '@/features/terminal/api/client'

export type TerminalDisplayConnectionKind = 'local' | 'ssh'

export type TerminalDisplaySessionState =
  | 'running'
  | 'idle'
  | 'starting'
  | 'exited'
  | 'failed'
  | 'disconnected'

export type TerminalSessionSeed = {
  runtimeWidgetId: string
  title: string
}

export type TerminalSessionView = {
  runtimeWidgetId: string
  sessionKey: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalDisplayConnectionKind
  sessionState: TerminalDisplaySessionState
  canSendInput: boolean
  canInterrupt: boolean
  isLoading: boolean
  error: string | null
  statusDetail: string | null
  outputChunks: TerminalOutputChunk[]
  runtimeState: TerminalRuntimeState | null
}
