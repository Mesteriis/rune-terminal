import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Cpu, Search, X } from 'lucide-react'

import { RunaDomScopeProvider } from '../dom-id'
import { Box, Button, Input, Text } from '../primitives'

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

const rootStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 'var(--gap-sm)',
  minHeight: '32px',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const clusterStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-sm)',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const searchWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  minWidth: 0,
  flex: 1,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const searchInputStyle = {
  flex: 1,
  minWidth: '160px',
  padding: 'var(--space-xs) var(--space-sm)',
  borderColor: 'var(--runa-terminal-surface-border, var(--color-border-strong))',
  background: 'var(--runa-terminal-surface-bg, var(--color-surface-glass-soft))',
  color: 'var(--runa-terminal-text-strong, var(--color-text-primary))',
  caretColor: 'var(--runa-terminal-status-running, var(--color-accent-emerald-strong))',
}

const iconButtonStyle = {
  minWidth: '28px',
  minHeight: '28px',
  padding: '0 var(--space-sm)',
  borderColor: 'var(--runa-terminal-surface-border, var(--color-border-strong))',
  color: 'var(--runa-terminal-text-secondary, var(--color-text-secondary))',
}

const rendererBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  marginLeft: 'auto',
  padding: '0 var(--space-sm)',
  minHeight: '24px',
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const badgeTextStyle = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
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
  return (
    <RunaDomScopeProvider component="terminal-toolbar">
      <Box runaComponent="terminal-toolbar-root" style={rootStyle}>
      <Box runaComponent="terminal-toolbar-action-cluster" style={clusterStyle}>
        <Button aria-label="Copy selection" onClick={onCopy} runaComponent="terminal-toolbar-copy" style={iconButtonStyle}>
          <Copy size={14} strokeWidth={1.8} />
        </Button>
        <Button aria-label="Paste from clipboard" onClick={onPaste} runaComponent="terminal-toolbar-paste" style={iconButtonStyle}>
          <ClipboardPaste size={14} strokeWidth={1.8} />
        </Button>
        <Button
          aria-expanded={isSearchOpen}
          aria-label="Toggle terminal search"
          onClick={onToggleSearch}
          runaComponent="terminal-toolbar-toggle-search"
          style={iconButtonStyle}
        >
          <Search size={14} strokeWidth={1.8} />
        </Button>
      </Box>
      {isSearchOpen ? (
        <Box runaComponent="terminal-toolbar-search-wrap" style={searchWrapStyle}>
          <Input
            aria-label="Search terminal output"
            autoFocus
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            placeholder="Search output"
            runaComponent="terminal-toolbar-search-input"
            style={searchInputStyle}
            value={searchQuery}
          />
          <Button aria-label="Find previous match" onClick={onSearchPrevious} runaComponent="terminal-toolbar-search-previous" style={iconButtonStyle}>
            <ChevronUp size={14} strokeWidth={1.8} />
          </Button>
          <Button aria-label="Find next match" onClick={onSearchNext} runaComponent="terminal-toolbar-search-next" style={iconButtonStyle}>
            <ChevronDown size={14} strokeWidth={1.8} />
          </Button>
          <Button aria-label="Close terminal search" onClick={onCloseSearch} runaComponent="terminal-toolbar-close-search" style={iconButtonStyle}>
            <X size={14} strokeWidth={1.8} />
          </Button>
        </Box>
      ) : null}
      <Box runaComponent="terminal-toolbar-renderer-badge" style={rendererBadgeStyle}>
        <Cpu color="var(--runa-terminal-text-muted, var(--color-text-muted))" size={14} strokeWidth={1.8} />
        <Text runaComponent="terminal-toolbar-renderer-badge-text" style={badgeTextStyle}>{rendererMode === 'webgl' ? 'WebGL' : 'Default'}</Text>
      </Box>
    </Box>
    </RunaDomScopeProvider>
  )
}
