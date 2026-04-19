import { useRef, useState } from 'react'

import { RunaDomScopeProvider, useRunaDomAutoTagging } from '../shared/ui/dom-id'
import { Box } from '../shared/ui/primitives'
import {
  TerminalSurface,
  TerminalToolbar,
  type TerminalSurfaceHandle,
  type TerminalConnectionKind,
  type TerminalSessionState,
} from '../shared/ui/components'

export type TerminalWidgetProps = {
  children?: React.ReactNode
  hostId: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  introLines?: string[]
}

const rootStyle = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-md)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function TerminalWidget({
  children,
  hostId,
  cwd,
  shellLabel,
  connectionKind,
  sessionState,
  introLines,
}: TerminalWidgetProps) {
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null)
  const terminalRootRef = useRunaDomAutoTagging('terminal-widget-root')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [rendererMode, setRendererMode] = useState<'default' | 'webgl'>('default')

  return (
    <RunaDomScopeProvider component="terminal-widget" widget={hostId}>
      <Box
        data-runa-terminal-root=""
        ref={terminalRootRef}
        runaComponent="terminal-widget-root"
        style={rootStyle}
      >
        <TerminalToolbar
          isSearchOpen={isSearchOpen}
          onCloseSearch={() => setIsSearchOpen(false)}
          onCopy={() => {
            void terminalSurfaceRef.current?.copySelection()
          }}
          onPaste={() => {
            void terminalSurfaceRef.current?.pasteFromClipboard()
          }}
          onSearchNext={() => {
            terminalSurfaceRef.current?.findNext(searchQuery)
          }}
          onSearchPrevious={() => {
            terminalSurfaceRef.current?.findPrevious(searchQuery)
          }}
          onSearchQueryChange={setSearchQuery}
          onToggleSearch={() => setIsSearchOpen((value) => !value)}
          rendererMode={rendererMode}
          searchQuery={searchQuery}
        />
        {children ?? null}
        <TerminalSurface
          connectionKind={connectionKind}
          cwd={cwd}
          hostId={hostId}
          introLines={introLines}
          onRendererModeChange={setRendererMode}
          onRequestSearch={() => setIsSearchOpen(true)}
          ref={terminalSurfaceRef}
          sessionState={sessionState}
          shellLabel={shellLabel}
        />
      </Box>
    </RunaDomScopeProvider>
  )
}
