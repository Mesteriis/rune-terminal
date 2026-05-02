import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import type { TerminalDockviewHeaderControls } from '@/widgets/terminal/terminal-dockview-header-controls'
import {
  clearTerminalDockviewHeaderControls,
  setTerminalDockviewHeaderControls,
} from '@/widgets/terminal/terminal-dockview-header-controls'
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

function createDockviewHeaderControls(createSessionMock = vi.fn()) {
  return {
    createSession: {
      ariaLabel: 'Create another terminal session for Workspace shell',
      disabled: false,
      label: 'New session',
      onClick: createSessionMock,
      title: 'Create a new backend-owned session inside this terminal widget',
    },
    explain: {
      ariaLabel: 'Explain and fix the latest terminal issue for Workspace shell',
      disabled: false,
      onClick: vi.fn(),
      title: 'Open AI and explain/fix the latest visible terminal issue',
    },
    interrupt: {
      ariaLabel: 'Interrupt terminal for Workspace shell',
      disabled: false,
      onClick: vi.fn(),
      title: 'Interrupt terminal',
    },
    recover: null,
    restart: {
      ariaLabel: 'Restart terminal for Workspace shell',
      disabled: false,
      onClick: vi.fn(),
      title: 'Restart shell',
    },
    toolbar: {
      isSearchOpen: false,
      onClear: vi.fn(),
      onCloseSearch: vi.fn(),
      onCopy: vi.fn(),
      onJumpToLatest: vi.fn(),
      onPaste: vi.fn(),
      onSearchNext: vi.fn(),
      onSearchPrevious: vi.fn(),
      onSearchQueryChange: vi.fn(),
      onToggleSearch: vi.fn(),
      searchQuery: '',
      searchResult: null,
    },
  } satisfies TerminalDockviewHeaderControls
}

describe('TerminalDockviewTabWidget', () => {
  afterEach(() => {
    clearTerminalDockviewHeaderControls('panel-1')
  })

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

  it('renders the create-session action in a separate single-tab Dockview header group', () => {
    const createSessionMock = vi.fn()

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
    setTerminalDockviewHeaderControls('panel-1', createDockviewHeaderControls(createSessionMock))

    render(<TerminalDockviewTabWidget {...(createHeaderProps('panel-1', 1) as never)} />)

    const createButton = screen.getByRole('button', {
      name: 'Create another terminal session for Workspace shell',
    })

    expect(createButton).toBeVisible()
    expect(
      createButton.closest('[data-runa-node="shell-panel-1-terminal-dockview-session-actions"]'),
    ).not.toBeNull()

    fireEvent.click(createButton)

    expect(createSessionMock).toHaveBeenCalledTimes(1)
  })
})
