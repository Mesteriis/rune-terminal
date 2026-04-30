import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShellTopbarWidget } from '@/widgets/shell/shell-topbar-widget'
import {
  activeWorkspaceTabStyle,
  topbarStyle,
  workspaceTabStyle,
} from '@/widgets/shell/shell-topbar-widget.styles'

function renderShellTopbar() {
  const onAddWorkspace = vi.fn()
  const onClose = vi.fn()
  const onDeleteWorkspace = vi.fn()
  const onMinimize = vi.fn()
  const onRenameWorkspace = vi.fn()
  const onSelectWorkspace = vi.fn()
  const onToggleFullscreen = vi.fn()
  const onToggleAi = vi.fn()

  render(
    <ShellTopbarWidget
      activeWorkspaceId={2}
      isAiOpen={false}
      onAddWorkspace={onAddWorkspace}
      onClose={onClose}
      onDeleteWorkspace={onDeleteWorkspace}
      onMinimize={onMinimize}
      onRenameWorkspace={onRenameWorkspace}
      onSelectWorkspace={onSelectWorkspace}
      onToggleFullscreen={onToggleFullscreen}
      onToggleAi={onToggleAi}
      workspaceTabs={[
        { id: 1, title: 'Workspace-1' },
        { id: 2, title: 'Workspace-2' },
        { id: 3, title: 'Workspace-3' },
      ]}
    />,
  )

  return {
    onAddWorkspace,
    onClose,
    onDeleteWorkspace,
    onMinimize,
    onRenameWorkspace,
    onSelectWorkspace,
    onToggleFullscreen,
    onToggleAi,
  }
}

describe('ShellTopbarWidget', () => {
  it('renders workspace tabs with active selection and title tooltip', () => {
    renderShellTopbar()

    const workspaceTwoTab = screen.getByRole('tab', { name: 'Workspace-2' })

    expect(workspaceTwoTab).toHaveAttribute('aria-selected', 'true')
    expect(workspaceTwoTab).toHaveAttribute('title', 'Workspace-2')
    expect(screen.getByRole('button', { name: 'Add workspace' })).toBeInTheDocument()
  })

  it('marks only the active workspace tab as selected', () => {
    renderShellTopbar()

    expect(screen.getByRole('tab', { name: 'Workspace-2' })).toHaveAttribute('data-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Workspace-1' })).toHaveAttribute('data-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Workspace-3' })).toHaveAttribute('data-selected', 'false')
  })

  it('keeps shell chrome colors on token-backed variables', () => {
    expect(topbarStyle.background).toBe('transparent')
    expect(topbarStyle.borderBottom).toBe('none')
    expect(workspaceTabStyle.background).toBe('var(--color-surface-glass-soft)')
    expect(workspaceTabStyle.border).toBe('1px solid var(--color-border-subtle)')
    expect(activeWorkspaceTabStyle.background).toBe(
      'color-mix(in srgb, var(--color-surface-glass-soft) 72%, var(--color-accent-emerald-soft) 28%)',
    )
    expect(activeWorkspaceTabStyle.border).toBe(
      '1px solid color-mix(in srgb, var(--color-accent-emerald-strong) 50%, var(--color-border-strong))',
    )
    expect(activeWorkspaceTabStyle.boxShadow).toBe('none')
  })

  it('routes workspace selection and add-workspace actions through callbacks', () => {
    const { onAddWorkspace, onSelectWorkspace } = renderShellTopbar()

    fireEvent.click(screen.getByRole('tab', { name: 'Workspace-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add workspace' }))

    expect(onSelectWorkspace).toHaveBeenCalledWith(1)
    expect(onAddWorkspace).toHaveBeenCalledTimes(1)
  })

  it('routes shell window controls through desktop callbacks', () => {
    const { onClose, onMinimize, onToggleFullscreen, onToggleAi } = renderShellTopbar()

    fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
    fireEvent.click(screen.getByRole('button', { name: 'Collapse window' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle fullscreen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle AI panel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onMinimize).toHaveBeenCalledTimes(1)
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1)
    expect(onToggleAi).toHaveBeenCalledTimes(1)
  })

  it('renames a workspace from the overflow menu', () => {
    const { onRenameWorkspace } = renderShellTopbar()

    fireEvent.click(screen.getByRole('button', { name: 'Workspace actions for Workspace-2' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /rename/i }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace name' }), {
      target: { value: 'Focus' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onRenameWorkspace).toHaveBeenCalledWith(2, 'Focus')
  })

  it('deletes a workspace from the overflow menu', () => {
    const { onDeleteWorkspace } = renderShellTopbar()

    fireEvent.click(screen.getByRole('button', { name: 'Workspace actions for Workspace-3' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }))

    expect(onDeleteWorkspace).toHaveBeenCalledWith(3)
  })

  it('opens the workspace overflow menu without selecting the workspace', () => {
    const { onSelectWorkspace } = renderShellTopbar()

    fireEvent.click(screen.getByRole('button', { name: 'Workspace actions for Workspace-1' }))

    expect(screen.getByRole('menu', { name: 'Workspace actions for Workspace-1' })).toBeInTheDocument()
    expect(onSelectWorkspace).not.toHaveBeenCalled()
  })
})
