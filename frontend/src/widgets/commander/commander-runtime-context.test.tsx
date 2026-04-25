import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CommanderRuntimeContext } from '@/widgets/commander/commander-runtime-context'

describe('CommanderRuntimeContext', () => {
  it('renders backend-owned shell/runtime metadata', () => {
    render(
      <CommanderRuntimeContext
        runtimeContext={{
          authToken: 'runtime-token',
          baseUrl: 'http://127.0.0.1:8090',
          colorTerm: 'truecolor',
          defaultShell: '/bin/zsh',
          homeDir: '/Users/avm',
          repoRoot: '/Users/avm/projects/runa-terminal',
          term: 'xterm-256color',
        }}
      />,
    )

    expect(screen.getByText('Shell')).toBeInTheDocument()
    expect(screen.getByText('/bin/zsh')).toBeInTheDocument()
    expect(screen.getByText('TERM')).toBeInTheDocument()
    expect(screen.getByText('xterm-256color')).toBeInTheDocument()
    expect(screen.getByText('COLORTERM')).toBeInTheDocument()
    expect(screen.getByText('truecolor')).toBeInTheDocument()
    expect(screen.getByText('Workspace root')).toBeInTheDocument()
    expect(screen.getByText('/Users/avm/projects/runa-terminal')).toBeInTheDocument()
  })

  it('falls back to Unavailable for blank terminal env values', () => {
    render(
      <CommanderRuntimeContext
        runtimeContext={{
          authToken: 'runtime-token',
          baseUrl: 'http://127.0.0.1:8090',
          colorTerm: '',
          defaultShell: '',
          homeDir: '/Users/avm',
          repoRoot: '/Users/avm/projects/runa-terminal',
          term: '',
        }}
      />,
    )

    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
  })
})
