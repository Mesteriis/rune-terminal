import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { TerminalWidget } from '@/widgets/terminal/terminal-widget'

const copySelectionMock = vi.fn(async () => undefined)
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
        themeMode?: 'adaptive' | 'contrast'
      },
      ref: React.ForwardedRef<{
        copySelection: () => Promise<void>
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
          {props.scrollback ?? 5000} · cursor:{props.cursorStyle ?? 'block'} · blink:
          {String(props.cursorBlink ?? true)}
        </div>
      )
    }),
  }
})

describe('TerminalWidget', () => {
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

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-side" title="Workspace shell" />)

    expect(screen.getByText('/Users/avm/projects/Personal/tideterm/runa-terminal')).toBeInTheDocument()
    expect(screen.getByText('Workspace shell')).toBeInTheDocument()
    expect(screen.getByText('zsh')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-surface-mock')).toHaveTextContent(
      'Attached to local shell. · font:15 · line:1.4 · theme:contrast · scrollback:7000 · cursor:bar · blink:false',
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

    fireEvent.click(screen.getByRole('button', { name: 'Close terminal search' }))

    expect(focusMock).toHaveBeenCalledTimes(1)
  })
})
