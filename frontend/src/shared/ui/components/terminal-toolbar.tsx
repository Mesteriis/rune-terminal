import { useEffect, useRef } from 'react'

import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Cpu, Search, X } from 'lucide-react'

import {
  terminalToolbarBadgeTextStyle,
  terminalToolbarClusterStyle,
  terminalToolbarIconButtonStyle,
  terminalToolbarRendererBadgeStyle,
  terminalToolbarRootStyle,
  terminalToolbarSearchInputStyle,
  terminalToolbarSearchWrapStyle,
} from '@/shared/ui/components/terminal-toolbar.styles'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Input, Text } from '@/shared/ui/primitives'

export type TerminalToolbarProps = {
  isSearchOpen: boolean
  rendererMode: 'default' | 'webgl'
  searchQuery: string
  onCloseSearch: () => void
  onCopy: () => void
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
  onCloseSearch,
  onCopy,
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

  return (
    <RunaDomScopeProvider component="terminal-toolbar">
      <Box runaComponent="terminal-toolbar-root" style={terminalToolbarRootStyle}>
        <Box runaComponent="terminal-toolbar-action-cluster" style={terminalToolbarClusterStyle}>
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
          <Button
            aria-expanded={isSearchOpen}
            aria-label="Toggle terminal search"
            onClick={onToggleSearch}
            runaComponent="terminal-toolbar-toggle-search"
            style={terminalToolbarIconButtonStyle}
          >
            <Search size={14} strokeWidth={1.8} />
          </Button>
        </Box>
        {isSearchOpen ? (
          <Box runaComponent="terminal-toolbar-search-wrap" style={terminalToolbarSearchWrapStyle}>
            <Input
              aria-label="Search terminal output"
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              placeholder="Search output"
              ref={searchInputRef}
              runaComponent="terminal-toolbar-search-input"
              style={terminalToolbarSearchInputStyle}
              value={searchQuery}
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
        ) : null}
        <Box runaComponent="terminal-toolbar-renderer-badge" style={terminalToolbarRendererBadgeStyle}>
          <Cpu color="var(--runa-terminal-text-muted, var(--color-text-muted))" size={14} strokeWidth={1.8} />
          <Text runaComponent="terminal-toolbar-renderer-badge-text" style={terminalToolbarBadgeTextStyle}>
            {rendererMode === 'webgl' ? 'WebGL' : 'Default'}
          </Text>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
