import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTerminalTab } from '@/features/terminal/api/client'
import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import { TerminalDockviewHeaderActionsWidget } from '@/widgets/terminal/terminal-dockview-header-actions-widget'
import * as terminalPanelModule from '@/widgets/terminal/terminal-panel'

vi.mock('@/features/terminal/api/client', () => ({
  createTerminalTab: vi.fn(),
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
  it('renders dense add and close controls for a terminal panel', () => {
    render(<TerminalDockviewHeaderActionsWidget {...(createHeaderActionsProps() as never)} />)

    expect(screen.getByRole('button', { name: 'Add terminal tab for Workspace shell' })).toBeInTheDocument()
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

  it('creates the next runtime-backed terminal tab when add is pressed', async () => {
    vi.mocked(createTerminalTab).mockResolvedValue({
      tab_id: 'tab-9',
      widget_id: 'term-9',
      title: 'Workspace shell',
    })

    const props = createHeaderActionsProps()

    render(<TerminalDockviewHeaderActionsWidget {...(props as never)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add terminal tab for Workspace shell' }))

    await waitFor(() => {
      expect(createTerminalTab).toHaveBeenCalledWith('Workspace shell')
      expect(props.containerApi.addPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'terminal',
          params: expect.objectContaining({
            runtimeTabId: 'tab-9',
            widgetId: 'term-9',
          }),
        }),
      )
    })
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
})
