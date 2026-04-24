import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
})
