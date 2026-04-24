import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TerminalToolbar } from '@/shared/ui/components/terminal-toolbar'

describe('TerminalToolbar', () => {
  it('prioritizes the search flow over the renderer badge when search opens', () => {
    const onToggleSearch = vi.fn()

    const { rerender } = render(
      <TerminalToolbar
        isSearchOpen={false}
        onClear={() => undefined}
        onCloseSearch={() => undefined}
        onCopy={() => undefined}
        onJumpToLatest={() => undefined}
        onPaste={() => undefined}
        onSearchNext={() => undefined}
        onSearchPrevious={() => undefined}
        onSearchQueryChange={() => undefined}
        onToggleSearch={onToggleSearch}
        rendererMode="webgl"
        searchQuery=""
      />,
    )

    expect(screen.getByText('WebGL')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle terminal search' }))
    expect(onToggleSearch).toHaveBeenCalledTimes(1)

    rerender(
      <TerminalToolbar
        isSearchOpen
        onClear={() => undefined}
        onCloseSearch={() => undefined}
        onCopy={() => undefined}
        onJumpToLatest={() => undefined}
        onPaste={() => undefined}
        onSearchNext={() => undefined}
        onSearchPrevious={() => undefined}
        onSearchQueryChange={() => undefined}
        onToggleSearch={onToggleSearch}
        rendererMode="webgl"
        searchQuery=""
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Search terminal output' })).toBeInTheDocument()
    expect(screen.queryByText('WebGL')).not.toBeInTheDocument()
  })
})
