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

  it('supports keyboard navigation inside the terminal search row', () => {
    const onSearchNext = vi.fn()
    const onSearchPrevious = vi.fn()
    const onCloseSearch = vi.fn()

    render(
      <TerminalToolbar
        isSearchOpen
        onClear={() => undefined}
        onCloseSearch={onCloseSearch}
        onCopy={() => undefined}
        onJumpToLatest={() => undefined}
        onPaste={() => undefined}
        onSearchNext={onSearchNext}
        onSearchPrevious={onSearchPrevious}
        onSearchQueryChange={() => undefined}
        onToggleSearch={() => undefined}
        rendererMode="default"
        searchQuery="needle"
      />,
    )

    const searchInput = screen.getByRole('textbox', { name: 'Search terminal output' })

    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter', shiftKey: true })
    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' })

    expect(onSearchNext).toHaveBeenCalledTimes(1)
    expect(onSearchPrevious).toHaveBeenCalledTimes(1)
    expect(onCloseSearch).toHaveBeenCalledTimes(1)
  })

  it('renders terminal search result status from xterm search events', () => {
    const { rerender } = render(
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
        onToggleSearch={() => undefined}
        rendererMode="default"
        searchQuery="needle"
        searchResult={{ resultCount: 4, resultIndex: 1 }}
      />,
    )

    expect(screen.getByLabelText('Terminal search results')).toHaveTextContent('2/4')

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
        onToggleSearch={() => undefined}
        rendererMode="default"
        searchQuery="missing"
        searchResult={{ resultCount: 0, resultIndex: -1 }}
      />,
    )

    expect(screen.getByLabelText('Terminal search results')).toHaveTextContent('No matches')
  })
})
