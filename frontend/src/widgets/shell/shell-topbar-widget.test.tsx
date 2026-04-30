import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  activeWorkspaceTabStyle,
  topbarStyle,
  workspaceTabStyle,
} from '@/widgets/shell/shell-topbar-widget.styles'
import { ShellTopbarWidget } from '@/widgets/shell/shell-topbar-widget'

function renderShellTopbar() {
  const onAddWorkspace = vi.fn()
  const onClose = vi.fn()
  const onMinimize = vi.fn()
  const onSelectWorkspace = vi.fn()
  const onToggleFullscreen = vi.fn()
  const onToggleAi = vi.fn()
  const onDeleteWorkspace = vi.fn()
  const onRenameWorkspace = vi.fn()

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
    onMinimize,
    onSelectWorkspace,
    onToggleFullscreen,
    onToggleAi,
    onDeleteWorkspace,
    onRenameWorkspace,
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
    expect(topbarStyle.borderBottom).toBe('1px solid var(--color-border-subtle)')
    expect(topbarStyle.backdropFilter).toBe('none')
    expect(topbarStyle.position).toBe('relative')
    expect(topbarStyle.zIndex).toBe('var(--z-shell-chrome)')
    expect(workspaceTabStyle.background).toBe('var(--color-surface-glass-soft)')
    expect(workspaceTabStyle.border).toBe('1px solid var(--color-border-subtle)')
    expect(activeWorkspaceTabStyle.background).toBe('var(--color-surface-glass)')
    expect(activeWorkspaceTabStyle.border).toBe('1px solid var(--color-border-strong)')
    expect(activeWorkspaceTabStyle.boxShadow).toBe('none')
  })
  it('routes workspace selection and add-workspace actions through callbacks', () => {
    const { onAddWorkspace, onSelectWorkspace } = renderShellTopbar()

    fireEvent.click(screen.getByRole('tab', { name: 'Workspace-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add workspace' }))

    expect(onSelectWorkspace).toHaveBeenCalledWith(1)
    expect(onAddWorkspace).toHaveBeenCalledTimes(1)
  })

  it('routes workspace menu rename and delete actions through callbacks', () => {
    const { onDeleteWorkspace, onRenameWorkspace } = renderShellTopbar()

    fireEvent.click(screen.getByRole('button', { name: 'Workspace actions for Workspace-2' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace name' }), {
      target: { value: 'Ops workspace' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onRenameWorkspace).toHaveBeenCalledWith(2, 'Ops workspace')

    fireEvent.click(screen.getByRole('button', { name: 'Workspace actions for Workspace-2' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(onDeleteWorkspace).toHaveBeenCalledWith(2)
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
})
