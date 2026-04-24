import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { TerminalWidget } from '@/widgets/terminal/terminal-widget'

const copySelectionMock = vi.fn(async () => undefined)
const findNextMock = vi.fn((_query: string) => true)
const findPreviousMock = vi.fn((_query: string) => true)
const focusMock = vi.fn(() => undefined)
const pasteFromClipboardMock = vi.fn(async () => undefined)

vi.mock('@/features/terminal/model/use-terminal-session', () => ({
  useTerminalSession: vi.fn(),
}))

vi.mock('@/shared/ui/components/terminal-surface', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    TerminalSurface: React.forwardRef(function MockTerminalSurface(
      props: {
        onRendererModeChange?: (mode: 'default' | 'webgl') => void
        onRequestSearch?: () => void
        statusMessage?: string | null
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
        copySelection: copySelectionMock,
        findNext: findNextMock,
        findPrevious: findPreviousMock,
        focus: focusMock,
        pasteFromClipboard: pasteFromClipboardMock,
      }))

      return <div data-testid="terminal-surface-mock">{props.statusMessage ?? 'terminal-ready'}</div>
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

    render(<TerminalWidget hostId="terminal" runtimeWidgetId="term-side" title="Workspace shell" />)

    expect(screen.getByText('/Users/avm/projects/Personal/tideterm/runa-terminal')).toBeInTheDocument()
    expect(screen.getByText('zsh')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-surface-mock')).toHaveTextContent('Attached to local shell.')

    await waitFor(() => {
      expect(screen.getByText('WebGL')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Toggle terminal search' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search terminal output' }), {
      target: { value: 'needle' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Find next match' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find previous match' }))

    expect(findNextMock).toHaveBeenCalledWith('needle')
    expect(findPreviousMock).toHaveBeenCalledWith('needle')

    fireEvent.click(screen.getByRole('button', { name: 'Copy selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paste from clipboard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Interrupt terminal for Workspace shell' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restart terminal for Workspace shell' }))

    expect(copySelectionMock).toHaveBeenCalledTimes(1)
    expect(pasteFromClipboardMock).toHaveBeenCalledTimes(1)
    expect(interruptSessionMock).toHaveBeenCalledTimes(1)
    expect(restartSessionMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close terminal search' }))

    expect(focusMock).toHaveBeenCalledTimes(1)
  })
})
