import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import { TerminalDockviewTabWidget } from '@/widgets/terminal/terminal-dockview-tab-widget'

vi.mock('@/features/i18n/model/locale-provider', () => ({
  useAppLocale: () => ({
    errorMessage: null,
    isLoading: false,
    isSaving: false,
    locale: 'en',
    refresh: vi.fn(async () => undefined),
    setLocale: vi.fn(async () => undefined),
  }),
}))

vi.mock('@/features/terminal/model/use-terminal-session', () => ({
  useTerminalSession: vi.fn(),
}))

function createHeaderProps(activePanelId: string, panelCount = 2) {
  return {
    api: {
      close: vi.fn(),
      group: {
        activePanel: activePanelId ? { id: activePanelId } : null,
        api: {
          onDidActivePanelChange: () => ({
            dispose: vi.fn(),
          }),
        },
        panels: Array.from({ length: panelCount }, (_, index) => ({
          id: `panel-${index + 1}`,
        })),
      },
      id: 'panel-1',
      onDidGroupChange: () => ({
        dispose: vi.fn(),
      }),
    },
    params: createTerminalPanelParams('workspace'),
  }
}

describe('TerminalDockviewTabWidget', () => {
  it('renders a shortened compact title with minimal active meta', () => {
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      cwd: '~/workspace/app',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: null,
      outputChunks: [],
      runtimeState: null,
      interruptSession: vi.fn(async () => undefined),
      restartSession: vi.fn(async () => undefined),
      sendInputChunk: vi.fn(async () => undefined),
    } as ReturnType<typeof useTerminalSession>)

    render(<TerminalDockviewTabWidget {...(createHeaderProps('panel-1') as never)} />)

    expect(screen.getByText('~/app')).toBeInTheDocument()
    expect(screen.getByText('~/app')).toHaveAttribute('title', '~/workspace/app')
    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.queryByText('zsh')).not.toBeInTheDocument()
  })

  it('hides compact meta when the terminal tab is inactive', () => {
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      cwd: '~/workspace/app',
      shellLabel: 'zsh',
      connectionKind: 'ssh',
      sessionState: 'idle',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: null,
      outputChunks: [],
      runtimeState: null,
      interruptSession: vi.fn(async () => undefined),
      restartSession: vi.fn(async () => undefined),
      sendInputChunk: vi.fn(async () => undefined),
    } as ReturnType<typeof useTerminalSession>)

    render(<TerminalDockviewTabWidget {...(createHeaderProps('panel-2') as never)} />)

    expect(screen.getByText('~/app')).toBeInTheDocument()
    expect(screen.queryByText('SSH')).not.toBeInTheDocument()
    expect(screen.queryByText('Idle')).not.toBeInTheDocument()
    expect(screen.queryByText('zsh')).not.toBeInTheDocument()
  })

  it('shows the compact tab close action only when the group has multiple panels', () => {
    vi.mocked(useTerminalSession).mockReturnValue({
      runtimeWidgetId: 'term-side',
      sessionKey: 'term-side:1',
      cwd: '~/workspace/app',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      canSendInput: true,
      canInterrupt: true,
      isLoading: false,
      isInterrupting: false,
      isRestarting: false,
      error: null,
      statusDetail: null,
      outputChunks: [],
      runtimeState: null,
      interruptSession: vi.fn(async () => undefined),
      restartSession: vi.fn(async () => undefined),
      sendInputChunk: vi.fn(async () => undefined),
    } as ReturnType<typeof useTerminalSession>)

    const { rerender } = render(<TerminalDockviewTabWidget {...(createHeaderProps('panel-1', 2) as never)} />)

    expect(screen.getByRole('button', { name: 'Close terminal tab for Workspace shell' })).toBeInTheDocument()

    rerender(<TerminalDockviewTabWidget {...(createHeaderProps('panel-1', 1) as never)} />)

    expect(
      screen.queryByRole('button', { name: 'Close terminal tab for Workspace shell' }),
    ).not.toBeInTheDocument()
  })
})
