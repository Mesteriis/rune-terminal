import { useEffect, useRef, type KeyboardEvent } from 'react'

import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Eraser, Search, X, ChevronsDown } from 'lucide-react'

import {
  terminalToolbarBadgeTextStyle,
  terminalToolbarClusterStyle,
  terminalToolbarDividerStyle,
  terminalToolbarIconButtonStyle,
  terminalToolbarRendererBadgeStyle,
  terminalToolbarRootStyle,
  terminalToolbarSearchInputStyle,
  terminalToolbarSearchStatusStyle,
  terminalToolbarSectionStyle,
  terminalToolbarSearchWrapStyle,
  terminalToolbarTrailingClusterStyle,
} from '@/shared/ui/components/terminal-toolbar.styles'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Input, Text } from '@/shared/ui/primitives'
import type { TerminalSearchResult } from '@/shared/ui/components/terminal-surface'

export type TerminalToolbarProps = {
  copy?: TerminalToolbarCopy
  isSearchOpen: boolean
  searchQuery: string
  searchResult?: TerminalSearchResult | null
  showRendererBadge?: boolean
  onClear: () => void
  onCloseSearch: () => void
  onCopy: () => void
  onJumpToLatest: () => void
  onPaste: () => void
  onSearchNext: () => void
  onSearchPrevious: () => void
  onSearchQueryChange: (value: string) => void
  onToggleSearch: () => void
}

export type TerminalToolbarCopy = {
  clearViewportAria: string
  closeSearchAria: string
  copySelectionAria: string
  findNextAria: string
  findNextTitle: string
  findPreviousAria: string
  findPreviousTitle: string
  jumpToLatestAria: string
  noMatches: string
  pasteFromClipboardAria: string
  rendererDefault: string
  rendererWebgl: string
  searchInputAria: string
  searchInputPlaceholder: string
  searchResultsAria: string
  searchShortcutHint: string
  toggleSearchAria: string
  typeQuery: string
}

const defaultTerminalToolbarCopy: TerminalToolbarCopy = {
  clearViewportAria: 'Clear terminal viewport',
  closeSearchAria: 'Close terminal search',
  copySelectionAria: 'Copy selection',
  findNextAria: 'Find next match',
  findNextTitle: 'Next match (Enter / F3 / Ctrl+G)',
  findPreviousAria: 'Find previous match',
  findPreviousTitle: 'Previous match (Shift+Enter / Shift+F3 / Shift+Ctrl+G)',
  jumpToLatestAria: 'Jump to latest terminal output',
  noMatches: 'No matches',
  pasteFromClipboardAria: 'Paste from clipboard',
  rendererDefault: 'Default',
  rendererWebgl: 'WebGL',
  searchInputAria: 'Search terminal output',
  searchInputPlaceholder: 'Search output',
  searchResultsAria: 'Terminal search results',
  searchShortcutHint: 'Enter / F3',
  toggleSearchAria: 'Toggle terminal search',
  typeQuery: 'Type query',
}

export function TerminalToolbar({
  copy = defaultTerminalToolbarCopy,
  isSearchOpen,
  searchQuery,
  searchResult = null,
  showRendererBadge = false,
  onClear,
  onCloseSearch,
  onCopy,
  onJumpToLatest,
  onPaste,
  onSearchNext,
  onSearchPrevious,
  onSearchQueryChange,
  onToggleSearch,
}: TerminalToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const trimmedSearchQuery = searchQuery.trim()
  const hasSearchQuery = trimmedSearchQuery !== ''
  const searchStatusText = !hasSearchQuery
    ? copy.typeQuery
    : !searchResult
      ? copy.searchShortcutHint
      : searchResult.resultCount <= 0
        ? copy.noMatches
        : `${Math.max(searchResult.resultIndex + 1, 1)}/${searchResult.resultCount}`

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  const handleSearchInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    const isModifierPressed = event.ctrlKey || event.metaKey

    if (event.key === 'Escape') {
      event.preventDefault()
      onCloseSearch()
      return
    }

    const isPreviousHotkey =
      (event.key === 'Enter' && event.shiftKey && !event.altKey && !isModifierPressed) ||
      (event.key === 'F3' && event.shiftKey && !event.altKey && !isModifierPressed) ||
      (event.key.toLowerCase() === 'g' && event.shiftKey && isModifierPressed && !event.altKey)

    if (isPreviousHotkey) {
      event.preventDefault()
      onSearchPrevious()
      return
    }

    const isNextHotkey =
      (event.key === 'Enter' && !event.shiftKey && !event.altKey && !isModifierPressed) ||
      (event.key === 'F3' && !event.shiftKey && !event.altKey && !isModifierPressed) ||
      (event.key.toLowerCase() === 'g' && !event.shiftKey && isModifierPressed && !event.altKey)

    if (!isNextHotkey) {
      return
    }

    event.preventDefault()
    onSearchNext()
  }

  return (
    <RunaDomScopeProvider component="terminal-toolbar">
      <Box runaComponent="terminal-toolbar-root" style={terminalToolbarRootStyle}>
        <Box runaComponent="terminal-toolbar-action-cluster" style={terminalToolbarClusterStyle}>
          <Box runaComponent="terminal-toolbar-edit-section" style={terminalToolbarSectionStyle}>
            <Button
              aria-label={copy.copySelectionAria}
              onClick={onCopy}
              runaComponent="terminal-toolbar-copy"
              style={terminalToolbarIconButtonStyle}
            >
              <Copy size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.pasteFromClipboardAria}
              onClick={onPaste}
              runaComponent="terminal-toolbar-paste"
              style={terminalToolbarIconButtonStyle}
            >
              <ClipboardPaste size={14} strokeWidth={1.8} />
            </Button>
          </Box>
          <Box runaComponent="terminal-toolbar-view-section" style={terminalToolbarSectionStyle}>
            <Button
              aria-expanded={isSearchOpen}
              aria-label={copy.toggleSearchAria}
              onClick={onToggleSearch}
              runaComponent="terminal-toolbar-toggle-search"
              style={terminalToolbarIconButtonStyle}
            >
              <Search size={14} strokeWidth={1.8} />
            </Button>
            <Box
              aria-hidden="true"
              runaComponent="terminal-toolbar-divider"
              style={terminalToolbarDividerStyle}
            />
            <Button
              aria-label={copy.clearViewportAria}
              onClick={onClear}
              runaComponent="terminal-toolbar-clear"
              style={terminalToolbarIconButtonStyle}
            >
              <Eraser size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label={copy.jumpToLatestAria}
              onClick={onJumpToLatest}
              runaComponent="terminal-toolbar-jump-latest"
              style={terminalToolbarIconButtonStyle}
            >
              <ChevronsDown size={14} strokeWidth={1.8} />
            </Button>
          </Box>
        </Box>
        <Box runaComponent="terminal-toolbar-trailing-cluster" style={terminalToolbarTrailingClusterStyle}>
          {isSearchOpen ? (
            <Box runaComponent="terminal-toolbar-search-wrap" style={terminalToolbarSearchWrapStyle}>
              <Input
                aria-label={copy.searchInputAria}
                onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
                onKeyDown={handleSearchInputKeyDown}
                placeholder={copy.searchInputPlaceholder}
                ref={searchInputRef}
                runaComponent="terminal-toolbar-search-input"
                style={terminalToolbarSearchInputStyle}
                value={searchQuery}
              />
              <Box
                aria-hidden="true"
                runaComponent="terminal-toolbar-search-divider"
                style={terminalToolbarDividerStyle}
              />
              <Text
                aria-label={copy.searchResultsAria}
                aria-live="polite"
                runaComponent="terminal-toolbar-search-status"
                style={terminalToolbarSearchStatusStyle}
              >
                {searchStatusText}
              </Text>
              <Button
                aria-label={copy.findPreviousAria}
                disabled={!hasSearchQuery}
                onClick={onSearchPrevious}
                runaComponent="terminal-toolbar-search-previous"
                style={terminalToolbarIconButtonStyle}
                title={copy.findPreviousTitle}
              >
                <ChevronUp size={14} strokeWidth={1.8} />
              </Button>
              <Button
                aria-label={copy.findNextAria}
                disabled={!hasSearchQuery}
                onClick={onSearchNext}
                runaComponent="terminal-toolbar-search-next"
                style={terminalToolbarIconButtonStyle}
                title={copy.findNextTitle}
              >
                <ChevronDown size={14} strokeWidth={1.8} />
              </Button>
              <Button
                aria-label={copy.closeSearchAria}
                onClick={onCloseSearch}
                runaComponent="terminal-toolbar-close-search"
                style={terminalToolbarIconButtonStyle}
              >
                <X size={14} strokeWidth={1.8} />
              </Button>
            </Box>
          ) : showRendererBadge ? (
            <Box runaComponent="terminal-toolbar-renderer-badge" style={terminalToolbarRendererBadgeStyle}>
              <Text
                runaComponent="terminal-toolbar-renderer-badge-text"
                style={terminalToolbarBadgeTextStyle}
              >
                {copy.rendererWebgl}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
