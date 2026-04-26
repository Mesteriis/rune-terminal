import { useEffect, useRef, type KeyboardEvent } from 'react'

import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Cpu,
  Eraser,
  Search,
  X,
  ChevronsDown,
} from 'lucide-react'

import {
  terminalToolbarBadgeTextStyle,
  terminalToolbarClusterStyle,
  terminalToolbarDividerStyle,
  terminalToolbarIconButtonStyle,
  terminalToolbarRendererBadgeStyle,
  terminalToolbarRootStyle,
  terminalToolbarSearchInputStyle,
  terminalToolbarSectionStyle,
  terminalToolbarSearchWrapStyle,
  terminalToolbarTrailingClusterStyle,
} from '@/shared/ui/components/terminal-toolbar.styles'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Input, Text } from '@/shared/ui/primitives'

export type TerminalToolbarProps = {
  isSearchOpen: boolean
  rendererMode: 'default' | 'webgl'
  searchQuery: string
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

export function TerminalToolbar({
  isSearchOpen,
  rendererMode,
  searchQuery,
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

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  const handleSearchInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onCloseSearch()
      return
    }

    if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }

    event.preventDefault()
    if (event.shiftKey) {
      onSearchPrevious()
      return
    }
    onSearchNext()
  }

  return (
    <RunaDomScopeProvider component="terminal-toolbar">
      <Box runaComponent="terminal-toolbar-root" style={terminalToolbarRootStyle}>
        <Box runaComponent="terminal-toolbar-action-cluster" style={terminalToolbarClusterStyle}>
          <Box runaComponent="terminal-toolbar-edit-section" style={terminalToolbarSectionStyle}>
            <Button
              aria-label="Copy selection"
              onClick={onCopy}
              runaComponent="terminal-toolbar-copy"
              style={terminalToolbarIconButtonStyle}
            >
              <Copy size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Paste from clipboard"
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
              aria-label="Toggle terminal search"
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
              aria-label="Clear terminal viewport"
              onClick={onClear}
              runaComponent="terminal-toolbar-clear"
              style={terminalToolbarIconButtonStyle}
            >
              <Eraser size={14} strokeWidth={1.8} />
            </Button>
            <Button
              aria-label="Jump to latest terminal output"
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
                aria-label="Search terminal output"
                onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
                onKeyDown={handleSearchInputKeyDown}
                placeholder="Search output"
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
              <Button
                aria-label="Find previous match"
                onClick={onSearchPrevious}
                runaComponent="terminal-toolbar-search-previous"
                style={terminalToolbarIconButtonStyle}
              >
                <ChevronUp size={14} strokeWidth={1.8} />
              </Button>
              <Button
                aria-label="Find next match"
                onClick={onSearchNext}
                runaComponent="terminal-toolbar-search-next"
                style={terminalToolbarIconButtonStyle}
              >
                <ChevronDown size={14} strokeWidth={1.8} />
              </Button>
              <Button
                aria-label="Close terminal search"
                onClick={onCloseSearch}
                runaComponent="terminal-toolbar-close-search"
                style={terminalToolbarIconButtonStyle}
              >
                <X size={14} strokeWidth={1.8} />
              </Button>
            </Box>
          ) : (
            <Box runaComponent="terminal-toolbar-renderer-badge" style={terminalToolbarRendererBadgeStyle}>
              <Cpu
                color="var(--runa-terminal-text-muted, var(--color-text-muted))"
                size={14}
                strokeWidth={1.8}
              />
              <Text
                runaComponent="terminal-toolbar-renderer-badge-text"
                style={terminalToolbarBadgeTextStyle}
              >
                {rendererMode === 'webgl' ? 'WebGL' : 'Default'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
