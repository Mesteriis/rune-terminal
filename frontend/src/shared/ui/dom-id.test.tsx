import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'

function AutoTaggedFixture() {
  const autoTagRoot = useRunaDomAutoTagging('auto-root')

  return (
    <div ref={autoTagRoot}>
      <span data-testid="auto-child">child</span>
    </div>
  )
}

describe('dom-id identity metadata', () => {
  it('keeps primitive metadata minimal by default', () => {
    render(
      <RunaDomScopeProvider component="test-scope" widget="tool">
        <Box runaComponent="primary-box">box</Box>
      </RunaDomScopeProvider>,
    )

    const box = screen.getByText('box')

    expect(box).toHaveAttribute('data-runa-node', 'shell-tool-primary-box')
    expect(box.id).toMatch(/^shell-tool-primary-box-/)
    expect(box).not.toHaveAttribute('data-runa-component')
    expect(box).not.toHaveAttribute('data-runa-layout')
    expect(box).not.toHaveAttribute('data-runa-widget')
  })

  it('restores verbose primitive metadata when requested', () => {
    render(
      <RunaDomScopeProvider component="test-scope" metadata="verbose" widget="tool">
        <Box runaComponent="primary-box">box</Box>
      </RunaDomScopeProvider>,
    )

    const box = screen.getByText('box')

    expect(box).toHaveAttribute('data-runa-node', 'shell-tool-primary-box')
    expect(box).toHaveAttribute('data-runa-component', 'primary-box')
    expect(box).toHaveAttribute('data-runa-layout', 'shell')
    expect(box).toHaveAttribute('data-runa-widget', 'tool')
  })

  it('keeps auto-tagged subtree metadata minimal by default', () => {
    render(
      <RunaDomScopeProvider component="terminal-widget" widget="terminal">
        <AutoTaggedFixture />
      </RunaDomScopeProvider>,
    )

    const child = screen.getByTestId('auto-child')

    expect(child).toHaveAttribute('data-runa-node', 'shell-terminal-terminal-widget')
    expect(child.id).toMatch(/^shell-terminal-terminal-widget-/)
    expect(child).not.toHaveAttribute('data-runa-component')
    expect(child).not.toHaveAttribute('data-runa-layout')
    expect(child).not.toHaveAttribute('data-runa-widget')
  })

  it('applies verbose metadata to auto-tagged subtrees when requested', () => {
    render(
      <RunaDomScopeProvider component="terminal-widget" metadata="verbose" widget="terminal">
        <AutoTaggedFixture />
      </RunaDomScopeProvider>,
    )

    const child = screen.getByTestId('auto-child')

    expect(child).toHaveAttribute('data-runa-node', 'shell-terminal-terminal-widget')
    expect(child).toHaveAttribute('data-runa-component', 'terminal-widget')
    expect(child).toHaveAttribute('data-runa-layout', 'shell')
    expect(child).toHaveAttribute('data-runa-widget', 'terminal')
  })
})
