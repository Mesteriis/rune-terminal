import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CommanderDockviewTabWidget } from '@/widgets/commander/commander-dockview-tab-widget'

function createHeaderProps(activePanelId: string, panelId = 'tool', panelCount = 2) {
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
          id: `tool-${index + 1}`,
        })),
      },
      id: panelId,
      onDidGroupChange: () => ({
        dispose: vi.fn(),
      }),
      title: 'tool',
    },
  }
}

describe('CommanderDockviewTabWidget', () => {
  it('renders a compact commander pill with a readable tab title', () => {
    render(<CommanderDockviewTabWidget {...(createHeaderProps('tool', 'tool-2', 2) as never)} />)

    expect(screen.getByText('commander')).toBeInTheDocument()
    expect(screen.getByText('tool 2')).toHaveAttribute('title', 'tool 2')
  })

  it('shows the tab close action only for multi-tab groups', () => {
    const { rerender } = render(
      <CommanderDockviewTabWidget {...(createHeaderProps('tool', 'tool', 2) as never)} />,
    )

    expect(screen.getByRole('button', { name: 'Close tool' })).toBeInTheDocument()

    rerender(<CommanderDockviewTabWidget {...(createHeaderProps('tool', 'tool', 1) as never)} />)

    expect(screen.queryByRole('button', { name: 'Close tool' })).not.toBeInTheDocument()
  })

  it('closes the panel through the dockview api', () => {
    const props = createHeaderProps('tool', 'tool-2', 2)

    render(<CommanderDockviewTabWidget {...(props as never)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close tool 2' }))

    expect(props.api.close).toHaveBeenCalledTimes(1)
  })
})
