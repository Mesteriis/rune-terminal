import type {
  TerminalOutputChunk,
  TerminalRuntimeState,
  TerminalShellOption,
} from '@/features/terminal/api/client'

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

export type TerminalSessionListEntry = {
  sessionId: string
  shellLabel: string
  connectionKind: TerminalDisplayConnectionKind
  connectionName: string | null
  remoteLaunchMode: string | null
  remoteSessionName: string | null
  sessionState: TerminalDisplaySessionState
  statusDetail: string | null
  cwd: string
  isActive: boolean
  runtimeState: TerminalRuntimeState
}

export type TerminalSessionView = {
  runtimeWidgetId: string
  sessionKey: string
  commandInputVersion: number
  activeSessionId: string | null
  cwd: string
  shellLabel: string
  connectionKind: TerminalDisplayConnectionKind
  sessionState: TerminalDisplaySessionState
  sessions: TerminalSessionListEntry[]
  canSendInput: boolean
  canInterrupt: boolean
  isCreatingSession: boolean
  isRecoveringStream: boolean
  isLoading: boolean
  isInterrupting: boolean
  isLoadingShells: boolean
  isRestarting: boolean
  isSwitchingShell: boolean
  error: string | null
  statusDetail: string | null
  outputChunks: TerminalOutputChunk[]
  runtimeState: TerminalRuntimeState | null
  shellOptions: TerminalShellOption[]
  createSession: () => Promise<void>
  focusSession: (sessionID: string) => Promise<void>
  closeSession: (sessionID: string) => Promise<void>
  loadShellOptions: () => Promise<void>
  recoverSession: () => Promise<void>
  sendInputChunk: (text: string) => Promise<void>
  interruptSession: () => Promise<void>
  restartSession: () => Promise<void>
  switchShell: (shellPath: string) => Promise<void>
}
