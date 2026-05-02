import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { closeWorkspaceWidget } from '@/shared/api/workspace'
import { createFilesPanelParams } from '@/widgets/files'
import { createPreviewPanelParams } from '@/widgets/preview'
import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import { TerminalDockviewHeaderActionsWidget } from '@/widgets/terminal/terminal-dockview-header-actions-widget'
import * as terminalPanelModule from '@/widgets/terminal/terminal-panel'

vi.mock('@/shared/api/workspace', () => ({
  closeWorkspaceWidget: vi.fn(),
  WorkspaceAPIError: class WorkspaceAPIError extends Error {
    status: number

    constructor(status: number) {
      super('workspace api error')
      this.status = status
    }
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

function createHeaderActionsProps(params = createTerminalPanelParams('workspace')) {
  return {
    activePanel: {
      id: 'terminal',
      title: 'Workspace shell',
      params,
      api: {
        close: vi.fn(),
      },
    },
    containerApi: {
      addPanel: vi.fn(),
      getPanel: vi.fn((_panelId: string) => null),
    },
  }
}

describe('TerminalDockviewHeaderActionsWidget', () => {
  it('renders only the close control for a terminal panel', () => {
    render(<TerminalDockviewHeaderActionsWidget {...(createHeaderActionsProps() as never)} />)

    expect(
      screen.queryByRole('button', { name: 'Add terminal tab for Workspace shell' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Workspace shell' })).toBeInTheDocument()
  })

  it('hides the terminal add action for a non-terminal active panel while keeping the generic close action', () => {
    const props = createHeaderActionsProps({ component: 'commander' } as never)
    props.activePanel.id = 'commander'
    props.activePanel.title = 'Commander'

    render(<TerminalDockviewHeaderActionsWidget {...(props as never)} />)

    expect(
      screen.queryByRole('button', { name: 'Add terminal tab for Workspace shell' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Commander' })).toBeInTheDocument()
  })

  it('delegates close through closeTerminalPanel', async () => {
    const closeTerminalPanelSpy = vi.spyOn(terminalPanelModule, 'closeTerminalPanel').mockResolvedValue(true)
    const props = createHeaderActionsProps()

    render(<TerminalDockviewHeaderActionsWidget {...(props as never)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace shell' }))

    await waitFor(() => {
      expect(closeTerminalPanelSpy).toHaveBeenCalledWith(
        props.activePanel.api,
        expect.objectContaining({
          preset: 'workspace',
          title: 'Workspace shell',
        }),
      )
    })
  })

  it('closes backend-owned files widgets before closing the Dockview panel', async () => {
    vi.mocked(closeWorkspaceWidget).mockResolvedValue({
      closed_widget_id: 'files-9',
    })
    const props = createHeaderActionsProps(
      createFilesPanelParams({
        path: '/repo',
        title: 'repo',
        widgetId: 'files-9',
      }) as never,
    )
    props.activePanel.id = 'files-9'
    props.activePanel.title = 'repo'

    render(<TerminalDockviewHeaderActionsWidget {...(props as never)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close repo' }))

    await waitFor(() => {
      expect(closeWorkspaceWidget).toHaveBeenCalledWith('files-9')
      expect(props.activePanel.api.close).toHaveBeenCalledTimes(1)
    })
  })

  it('closes backend-owned preview widgets before closing the Dockview panel', async () => {
    vi.mocked(closeWorkspaceWidget).mockResolvedValue({
      closed_widget_id: 'preview-9',
    })
    const props = createHeaderActionsProps(
      createPreviewPanelParams({
        path: '/repo/README.md',
        title: 'README.md',
        widgetId: 'preview-9',
      }) as never,
    )
    props.activePanel.id = 'preview-9'
    props.activePanel.title = 'README.md'

    render(<TerminalDockviewHeaderActionsWidget {...(props as never)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close README.md' }))

    await waitFor(() => {
      expect(closeWorkspaceWidget).toHaveBeenCalledWith('preview-9')
      expect(props.activePanel.api.close).toHaveBeenCalledTimes(1)
    })
  })

  it('closes frontend-local non-terminal panels locally', async () => {
    const props = createHeaderActionsProps({ component: 'commander' } as never)
    props.activePanel.id = 'commander'
    props.activePanel.title = 'Commander'

    render(<TerminalDockviewHeaderActionsWidget {...(props as never)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close Commander' }))

    await waitFor(() => {
      expect(closeWorkspaceWidget).not.toHaveBeenCalled()
      expect(props.activePanel.api.close).toHaveBeenCalledTimes(1)
    })
  })
})
