import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchTerminalDiagnostics,
  fetchTerminalLatestCommand,
  sendTerminalInput,
  TerminalAPIError,
} from '@/features/terminal/api/client'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useAppTheme } from '@/features/theme/model/theme-provider'
import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { queueAiPromptHandoff } from '@/shared/model/ai-handoff'
import { openAiSidebar } from '@/shared/model/app'
import { TerminalWidget } from '@/widgets/terminal/terminal-widget'

const copySelectionMock = vi.fn(async () => undefined)
const clearSearchMock = vi.fn(() => undefined)
const clearViewportMock = vi.fn(() => undefined)
const findNextMock = vi.fn((_query: string) => true)
const findPreviousMock = vi.fn((_query: string) => true)
const focusMock = vi.fn(() => undefined)
const jumpToLatestMock = vi.fn(() => undefined)
const pasteFromClipboardMock = vi.fn(async () => undefined)

vi.mock('@/features/terminal/model/use-terminal-session', () => ({
  useTerminalSession: vi.fn(),
}))

vi.mock('@/features/terminal/model/use-terminal-preferences', () => ({
  useTerminalPreferences: vi.fn(),
}))

vi.mock('@/features/i18n/model/locale-provider', () => ({
  useAppLocale: vi.fn(),
}))

vi.mock('@/features/theme/model/theme-provider', () => ({
  useAppTheme: vi.fn(),
}))

vi.mock('@/features/terminal/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/terminal/api/client')>()

  return {
    ...actual,
    fetchTerminalDiagnostics: vi.fn(),
    fetchTerminalLatestCommand: vi.fn(),
    sendTerminalInput: vi.fn(),
  }
})

vi.mock('@/shared/model/app', () => ({
  openAiSidebar: vi.fn(),
}))

vi.mock('@/shared/model/ai-handoff', () => ({
  queueAiPromptHandoff: vi.fn(),
}))

vi.mock('@/shared/ui/components/terminal-surface', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    TerminalSurface: React.forwardRef(function MockTerminalSurface(
      props: {
        cursorBlink?: boolean
        cursorStyle?: 'block' | 'bar' | 'underline'
        fontSize?: number
        lineHeight?: number
        onRendererModeChange?: (mode: 'default' | 'webgl') => void
        onRequestSearch?: () => void
        scrollback?: number
        statusMessage?: string | null
        themeSignal?: string
        themeMode?: 'adaptive' | 'contrast'
      },
      ref: React.ForwardedRef<{
        copySelection: () => Promise<void>
        clearSearch: () => void
        findNext: (query: string) => boolean
        findPrevious: (query: string) => boolean
        focus: () => void
        pasteFromClipboard: () => Promise<void>
      }>,
    ) {
      React.useEffect(() => {
        props.onRendererModeChange?.('webgl')
      }, [props])

      React.useImperativeHandle(ref, () => ({
        clearSearch: clearSearchMock,
        clearViewport: clearViewportMock,
        copySelection: copySelectionMock,
        findNext: findNextMock,
        findPrevious: findPreviousMock,
        focus: focusMock,
        jumpToLatest: jumpToLatestMock,
        pasteFromClipboard: pasteFromClipboardMock,
      }))

      return (
        <div data-testid="terminal-surface-mock">
          {props.statusMessage ?? 'terminal-ready'} · font:{props.fontSize ?? 13} · line:
          {props.lineHeight ?? 1.25} · theme:{props.themeMode ?? 'adaptive'} · scrollback:
          {props.scrollback ?? 5000} · theme-signal:{props.themeSignal ?? 'none'} · cursor:
          {props.cursorStyle ?? 'block'} · blink:{String(props.cursorBlink ?? true)}
        </div>
      )
    }),
  }
})

describe('TerminalWidget', () => {
  beforeEach(() => {
    vi.mocked(useAppLocale).mockReturnValue({
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      locale: 'en',
      refresh: vi.fn(async () => undefined),
      setLocale: vi.fn(async () => undefined),
      supportedLocales: ['ru', 'en', 'zh-CN', 'es'],
    })
    vi.mocked(useAppTheme).mockReturnValue({
      resolvedTheme: 'dark',
      setThemePreference: vi.fn(),
      themePreference: 'system',
    })
    vi.mocked(fetchTerminalLatestCommand).mockRejectedValue(
      new TerminalAPIError(404, 'terminal_command_not_found', 'terminal command not found'),
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders terminal chrome and wires toolbar actions into the surface handle', async () => {
    const interruptSessionMock = vi.fn(async () => undefined)
    const restartSessionMock = vi.fn(async () => undefined)

    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      cwd: '/Users/avm/projects/Personal/tideterm/runa-terminal',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: 'Attached to local shell.',
      outputChunks: [],
      runtimeState: null,
      interruptSession: interruptSessionMock,
      sendInputChunk: vi.fn(),
      restartSession: restartSessionMock,
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: false,
      cursorStyle: 'bar',
      fontSize: 15,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.4,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 7000,
      themeMode: 'contrast',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })
    vi.mocked(fetchTerminalDiagnostics).mockResolvedValue({
      widget_id: 'term-side',
      session_state: 'running',
      status_detail: 'Attached to local shell.',
      issue_summary: 'Attached to local shell.',
      output_excerpt: 'terminal-ready',
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-side" title="Workspace shell" />)

    expect(screen.getByText('/Users/avm/projects/Personal/tideterm/runa-terminal')).toBeInTheDocument()
    expect(screen.getByText('Workspace shell')).toBeInTheDocument()
    expect(screen.getByText('zsh')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-surface-mock')).toHaveTextContent(
      'Attached to local shell. · font:15 · line:1.4 · theme:contrast · scrollback:7000 · theme-signal:dark · cursor:bar · blink:false',
    )

    await waitFor(() => {
      expect(screen.getByText('WebGL')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Toggle terminal search' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search terminal output' }), {
      target: { value: 'needle' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find next match' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find previous match' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search terminal output' }), {
      key: 'Enter',
      code: 'Enter',
    })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search terminal output' }), {
      key: 'Enter',
      code: 'Enter',
      shiftKey: true,
    })

    expect(findNextMock).toHaveBeenCalledTimes(2)
    expect(findNextMock).toHaveBeenCalledWith('needle')
    expect(findPreviousMock).toHaveBeenCalledTimes(2)
    expect(findPreviousMock).toHaveBeenCalledWith('needle')

    fireEvent.click(screen.getByRole('button', { name: 'Copy selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paste from clipboard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear terminal viewport' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest terminal output' }))
    fireEvent.click(screen.getByRole('button', { name: 'Interrupt terminal for Workspace shell' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restart terminal for Workspace shell' }))

    expect(copySelectionMock).toHaveBeenCalledTimes(1)
    expect(clearViewportMock).toHaveBeenCalledTimes(1)
    expect(jumpToLatestMock).toHaveBeenCalledTimes(1)
    expect(pasteFromClipboardMock).toHaveBeenCalledTimes(1)
    expect(interruptSessionMock).toHaveBeenCalledTimes(1)
    expect(restartSessionMock).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'Explain and fix the latest terminal issue for Workspace shell' }),
    ).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Close terminal search' }))

    expect(focusMock).toHaveBeenCalledTimes(1)
    expect(clearSearchMock).toHaveBeenCalledTimes(1)
  })

  it('renders terminal controls through the active locale copy', () => {
    vi.mocked(useAppLocale).mockReturnValue({
      errorMessage: null,
      isLoading: false,
      isSaving: false,
      locale: 'ru',
      refresh: vi.fn(async () => undefined),
      setLocale: vi.fn(async () => undefined),
      supportedLocales: ['ru', 'en', 'zh-CN', 'es'],
    })
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      cwd: '/repo',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: 'Attached to local shell.',
      outputChunks: [],
      runtimeState: null,
      interruptSession: vi.fn(),
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-side" title="Рабочий терминал" />)

    expect(
      screen.getByRole('button', { name: 'Создать ещё одну сессию терминала для Рабочий терминал' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Новая сессия')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Переключить поиск в терминале' }))

    expect(screen.getByRole('textbox', { name: 'Поиск в выводе терминала' })).toBeInTheDocument()
    expect(screen.getByLabelText('Результаты поиска в терминале')).toHaveTextContent('Введите запрос')
  })

  it('surfaces no-match search state and clears stale decorations on empty query', () => {
    findNextMock.mockReturnValueOnce(false)

    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      cwd: '/repo',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: 'Attached to local shell.',
      outputChunks: [],
      runtimeState: null,
      interruptSession: vi.fn(),
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-side" title="Workspace shell" />)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle terminal search' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search terminal output' }), {
      target: { value: 'missing' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find next match' }))

    expect(screen.getByLabelText('Terminal search results')).toHaveTextContent('No matches')

    fireEvent.change(screen.getByRole('textbox', { name: 'Search terminal output' }), {
      target: { value: '' },
    })

    expect(clearSearchMock).toHaveBeenCalled()
    expect(screen.getByLabelText('Terminal search results')).toHaveTextContent('Type query')
  })

  it('hands backend terminal diagnostics to the AI sidebar from the explain and fix button', async () => {
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-pve',
      sessionKey: 'term-pve:1',
      cwd: '/srv',
      shellLabel: 'zsh',
      connectionKind: 'ssh',
      sessionState: 'failed',
      canSendInput: true,
      canInterrupt: false,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: 'df: cannot read table of mounted file systems',
      statusDetail: 'Remote shell reported a command failure.',
      outputChunks: [
        {
          data: 'df: cannot read table of mounted file systems\n',
          seq: 7,
          timestamp: '2026-04-26T11:20:00Z',
        },
      ],
      runtimeState: null,
      interruptSession: vi.fn(),
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })
    vi.mocked(fetchTerminalDiagnostics).mockResolvedValue({
      widget_id: 'term-pve',
      session_state: 'failed',
      status_detail: 'Remote shell reported a command failure.',
      issue_summary: 'df: cannot read table of mounted file systems',
      output_excerpt: 'df: cannot read table of mounted file systems',
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-pve" title="PVE host" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Explain and fix the latest terminal issue for PVE host' }),
    )

    await waitFor(() => {
      expect(fetchTerminalDiagnostics).toHaveBeenCalledWith('term-pve')
      expect(queueAiPromptHandoff).toHaveBeenCalledWith({
        context_widget_ids: ['term-pve'],
        prompt: expect.stringContaining('Review and help explain and fix the latest error in this terminal.'),
        submit: true,
      })
      expect(queueAiPromptHandoff).toHaveBeenCalledWith({
        context_widget_ids: ['term-pve'],
        prompt: expect.stringContaining('df: cannot read table of mounted file systems'),
        submit: true,
      })
      expect(openAiSidebar).toHaveBeenCalledTimes(1)
    })
  })

  it('renders the latest terminal command strip and reruns that command', async () => {
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      commandInputVersion: 0,
      cwd: '/repo',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: 'Attached to local shell.',
      outputChunks: [
        {
          data: '/repo\n',
          seq: 12,
          timestamp: '2026-04-27T10:00:10Z',
        },
      ],
      runtimeState: null,
      interruptSession: vi.fn(),
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })
    vi.mocked(fetchTerminalLatestCommand).mockResolvedValue({
      widget_id: 'term-side',
      session_id: 'term-side',
      command: 'pwd',
      from_seq: 11,
      submitted_at: '2026-04-27T10:00:00Z',
      output_excerpt: '/repo',
      status: 'running',
      explain_summary: 'The command prints the current working directory.',
    })
    vi.mocked(sendTerminalInput).mockResolvedValue({
      widget_id: 'term-side',
      bytes_sent: 4,
      append_newline: true,
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-side" title="Workspace shell" />)

    await waitFor(() => {
      expect(fetchTerminalLatestCommand).toHaveBeenCalledWith('term-side')
      expect(screen.getByText('Latest command')).toBeInTheDocument()
      expect(screen.getByText('pwd')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Re-run the latest command for Workspace shell' }))

    await waitFor(() => {
      expect(sendTerminalInput).toHaveBeenCalledWith('term-side', 'pwd', true)
    })
  })

  it('hands the latest terminal command to the AI sidebar from the command-aware explain action', async () => {
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-pve',
      sessionKey: 'term-pve:1',
      commandInputVersion: 0,
      cwd: '/srv',
      shellLabel: 'ssh',
      connectionKind: 'ssh',
      sessionState: 'failed',
      canSendInput: true,
      canInterrupt: false,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: 'df: cannot read table of mounted file systems',
      statusDetail: 'Remote shell reported a command failure.',
      outputChunks: [
        {
          data: 'df: cannot read table of mounted file systems\n',
          seq: 9,
          timestamp: '2026-04-27T11:20:00Z',
        },
      ],
      runtimeState: null,
      interruptSession: vi.fn(),
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })
    vi.mocked(fetchTerminalLatestCommand).mockResolvedValue({
      widget_id: 'term-pve',
      session_id: 'term-pve',
      command: 'df -h',
      from_seq: 7,
      submitted_at: '2026-04-27T11:19:50Z',
      output_excerpt: 'df: cannot read table of mounted file systems',
      status: 'failed',
      status_detail: 'Remote shell reported a command failure.',
      explain_summary: 'The command failed because the mount table is unreadable.',
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-pve" title="PVE host" />)

    await waitFor(() => {
      expect(screen.getByText('df -h')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Explain the latest command for PVE host' }))

    await waitFor(() => {
      expect(queueAiPromptHandoff).toHaveBeenCalledWith({
        context_widget_ids: ['term-pve'],
        prompt: expect.stringContaining(
          'Explain the result of the latest terminal command and suggest the next practical step.',
        ),
        submit: true,
      })
      expect(queueAiPromptHandoff).toHaveBeenCalledWith({
        context_widget_ids: ['term-pve'],
        prompt: expect.stringContaining('df -h'),
        submit: true,
      })
      expect(openAiSidebar).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a terminal recovery action for disconnected tmux-backed SSH sessions', async () => {
    const recoverSessionMock = vi.fn(async () => undefined)

    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-pve',
      sessionKey: 'term-pve:1',
      activeSessionId: 'term-pve',
      cwd: 'prod-shell',
      shellLabel: 'ssh',
      connectionKind: 'ssh',
      sessionState: 'disconnected',
      sessions: [],
      canSendInput: false,
      canInterrupt: false,
      isCreatingSession: false,
      isRecoveringStream: false,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: 'session is not running; restart explicitly to create a new process',
      outputChunks: [],
      runtimeState: {
        widget_id: 'term-pve',
        session_id: 'term-pve',
        shell: 'ssh',
        status: 'disconnected',
        pid: 0,
        started_at: '2026-04-27T09:00:00Z',
        can_send_input: false,
        can_interrupt: false,
        connection_id: 'conn-pve',
        connection_name: 'pve',
        connection_kind: 'ssh',
        remote_launch_mode: 'tmux',
        remote_session_name: 'prod-main',
      },
      closeSession: vi.fn(),
      createSession: vi.fn(),
      focusSession: vi.fn(),
      interruptSession: vi.fn(),
      recoverSession: recoverSessionMock,
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })
    vi.mocked(fetchTerminalDiagnostics).mockResolvedValue({
      widget_id: 'term-pve',
      session_state: 'disconnected',
      status_detail: 'session is not running; restart explicitly to create a new process',
      issue_summary: 'session is not running; restart explicitly to create a new process',
      output_excerpt: '',
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-pve" title="PVE host" />)

    const recoveryButton = screen.getByRole('button', { name: 'Recover terminal session for PVE host' })
    expect(recoveryButton).toHaveTextContent('Resume session')

    fireEvent.click(recoveryButton)

    await waitFor(() => {
      expect(recoverSessionMock).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a grouped session rail and switches sessions through the terminal hook', async () => {
    const createSessionMock = vi.fn(async () => undefined)
    const closeSessionMock = vi.fn(async () => undefined)
    const focusSessionMock = vi.fn(async () => undefined)

    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-main',
      sessionKey: 'term-main:1',
      activeSessionId: 'sess-2',
      cwd: '/repo',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      sessions: [
        {
          sessionId: 'term-main',
          shellLabel: 'zsh',
          connectionKind: 'local',
          connectionName: 'Local Machine',
          remoteLaunchMode: null,
          remoteSessionName: null,
          sessionState: 'running',
          statusDetail: null,
          cwd: '/repo',
          isActive: false,
          runtimeState: {
            widget_id: 'term-main',
            session_id: 'term-main',
            shell: '/bin/zsh',
            status: 'running',
            pid: 101,
            started_at: '2026-04-26T12:00:00Z',
            can_send_input: true,
            can_interrupt: true,
            working_dir: '/repo',
          },
        },
        {
          sessionId: 'sess-2',
          shellLabel: 'zsh',
          connectionKind: 'local',
          connectionName: 'Local Machine',
          remoteLaunchMode: null,
          remoteSessionName: null,
          sessionState: 'running',
          statusDetail: null,
          cwd: '/repo',
          isActive: true,
          runtimeState: {
            widget_id: 'term-main',
            session_id: 'sess-2',
            shell: '/bin/zsh',
            status: 'running',
            pid: 202,
            started_at: '2026-04-26T12:05:00Z',
            can_send_input: true,
            can_interrupt: true,
            working_dir: '/repo',
          },
        },
      ],
      canSendInput: true,
      canInterrupt: true,
      isCreatingSession: false,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: 'Attached to local shell.',
      outputChunks: [],
      runtimeState: {
        widget_id: 'term-main',
        session_id: 'sess-2',
        shell: '/bin/zsh',
        status: 'running',
        pid: 202,
        started_at: '2026-04-26T12:05:00Z',
        can_send_input: true,
        can_interrupt: true,
        working_dir: '/repo',
      },
      closeSession: closeSessionMock,
      createSession: createSessionMock,
      focusSession: focusSessionMock,
      interruptSession: vi.fn(),
      sendInputChunk: vi.fn(),
      restartSession: vi.fn(),
    } as ReturnType<typeof useTerminalSession>)
    vi.mocked(useTerminalPreferences).mockReturnValue({
      errorMessage: null,
      decreaseFontSize: vi.fn(),
      decreaseLineHeight: vi.fn(),
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      increaseFontSize: vi.fn(),
      increaseLineHeight: vi.fn(),
      increaseScrollback: vi.fn(),
      isLoading: false,
      isSaving: false,
      lineHeight: 1.25,
      refresh: vi.fn(async () => undefined),
      resetScrollback: vi.fn(),
      resetFontSize: vi.fn(),
      resetLineHeight: vi.fn(),
      resetCursorBlink: vi.fn(),
      resetCursorStyle: vi.fn(),
      resetThemeMode: vi.fn(),
      scrollback: 5000,
      themeMode: 'adaptive',
      decreaseScrollback: vi.fn(),
      updateCursorBlink: vi.fn(),
      updateFontSize: vi.fn(),
      updateLineHeight: vi.fn(),
      updateCursorStyle: vi.fn(),
      updateThemeMode: vi.fn(),
    })

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-main" title="Main terminal" />)

    expect(
      screen.getByRole('button', { name: 'Create another terminal session for Main terminal' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Focus terminal session 1 for Main terminal' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Focus terminal session 2 for Main terminal' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Create another terminal session for Main terminal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Focus terminal session 1 for Main terminal' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Browse grouped terminal sessions for Main terminal' }),
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter grouped terminal sessions' }), {
      target: { value: 'local machine' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close terminal session 1 for Main terminal' }))

    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalledTimes(1)
      expect(focusSessionMock).toHaveBeenCalledWith('term-main')
      expect(closeSessionMock).toHaveBeenCalledWith('term-main')
    })
  })
})
