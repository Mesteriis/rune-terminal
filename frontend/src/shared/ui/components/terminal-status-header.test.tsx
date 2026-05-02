import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TerminalStatusHeader } from '@/shared/ui/components/terminal-status-header'

describe('TerminalStatusHeader', () => {
  it('renders title and terminal meta badges by default', () => {
    render(
      <TerminalStatusHeader
        connectionKind="local"
        cwd="~/workspace"
        sessionState="running"
        shellLabel="zsh"
        title="Main terminal"
      />,
    )

    expect(screen.getByText('Main terminal')).toBeInTheDocument()
    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('zsh')).toBeInTheDocument()
  })

  it('renders secondary text as an expanded stacked header in non-compact mode', () => {
    render(
      <TerminalStatusHeader
        connectionKind="local"
        cwd="~/workspace/app"
        primaryText="~/workspace/app"
        secondaryText="Workspace shell"
        sessionState="running"
        shellLabel="zsh"
        title="Workspace shell"
      />,
    )

    expect(screen.getByText('~/workspace/app')).toBeInTheDocument()
    expect(screen.getByText('Workspace shell')).toBeInTheDocument()
  })

  it('prefers primaryText in compact mode and can hide meta badges', () => {
    render(
      <TerminalStatusHeader
        compact
        connectionKind="ssh"
        cwd="~/workspace"
        primaryText="~/workspace/app"
        secondaryText="Workspace shell"
        sessionState="idle"
        shellLabel="bash"
        showMeta={false}
        title="Ignored title"
      />,
    )

    expect(screen.getByText('~/workspace/app')).toBeInTheDocument()
    expect(screen.queryByText('SSH')).not.toBeInTheDocument()
    expect(screen.queryByText('Idle')).not.toBeInTheDocument()
    expect(screen.queryByText('bash')).not.toBeInTheDocument()
    expect(screen.queryByText('Workspace shell')).not.toBeInTheDocument()
  })

  it('keeps compact active meta minimal when requested', () => {
    render(
      <TerminalStatusHeader
        compact
        compactMetaMode="minimal"
        connectionKind="local"
        cwd="~/workspace/app"
        primaryText="app"
        sessionState="running"
        shellLabel="zsh"
        title="Workspace shell"
      />,
    )

    expect(screen.getByText('app')).toBeInTheDocument()
    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.queryByText('zsh')).not.toBeInTheDocument()
    expect(screen.getByText('app')).toHaveAttribute('title', '~/workspace/app')
  })

  it('keeps compact status pills and action controls on the same surface group', () => {
    render(
      <TerminalStatusHeader
        actionSlot={<button type="button">Action</button>}
        compact
        connectionKind="local"
        cwd="~/workspace/app"
        primaryText="term_1"
        sessionState="running"
        shellLabel="zsh"
        title="Workspace shell"
      />,
    )

    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.queryByText('zsh')).toBeInTheDocument()
  })

  it('opens local shell options and selects a shell from the header badge', () => {
    const onOpenShellMenu = vi.fn()
    const onSelectShell = vi.fn()

    render(
      <TerminalStatusHeader
        activeShell="/bin/zsh"
        connectionKind="local"
        cwd="~/workspace/app"
        onOpenShellMenu={onOpenShellMenu}
        onSelectShell={onSelectShell}
        sessionState="running"
        shellLabel="zsh"
        shellOptions={[
          { path: '/bin/zsh', name: 'zsh', default: true },
          { path: '/bin/bash', name: 'bash' },
        ]}
        title="Workspace shell"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'zsh' }))

    expect(onOpenShellMenu).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: /bash/ }))

    expect(onSelectShell).toHaveBeenCalledWith('/bin/bash')
  })

  it('renders the local shell menu on the body overlay layer', () => {
    const { container } = render(
      <TerminalStatusHeader
        activeShell="/bin/zsh"
        connectionKind="local"
        cwd="~/workspace/app"
        onSelectShell={vi.fn()}
        sessionState="running"
        shellLabel="zsh"
        shellOptions={[{ path: '/bin/zsh', name: 'zsh', default: true }]}
        title="Workspace shell"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'zsh' }))

    const shellMenu = screen.getByRole('menu')

    expect(document.body).toContainElement(shellMenu)
    expect(container).not.toContainElement(shellMenu)
    expect(shellMenu).toHaveStyle({
      position: 'fixed',
      zIndex: 'var(--z-modal-body)',
    })
  })
})
