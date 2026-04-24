import { useCallback, useState, useRef } from 'react'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { ClearBox } from '@/shared/ui/components'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { TerminalStatusHeader } from '@/shared/ui/components/terminal-status-header'
import { TerminalSurface, type TerminalSurfaceHandle } from '@/shared/ui/components/terminal-surface'
import { TerminalToolbar } from '@/shared/ui/components/terminal-toolbar'
import {
  terminalWidgetChromeStyle,
  terminalWidgetRootStyle,
  terminalWidgetSurfaceWrapStyle,
} from '@/widgets/terminal/terminal-widget.styles'

export type TerminalWidgetProps = {
  hostId: string
  runtimeWidgetId: string
  title: string
  themeClassTarget?: HTMLElement | null
}

export function TerminalWidget({
  hostId,
  runtimeWidgetId,
  title,
  themeClassTarget = null,
}: TerminalWidgetProps) {
  const terminalRootRef = useRunaDomAutoTagging('terminal-widget-root')
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [rendererMode, setRendererMode] = useState<'default' | 'webgl'>('default')
  const [searchQuery, setSearchQuery] = useState('')
  const terminalSession = useTerminalSession({
    runtimeWidgetId,
    title,
  })
  const handleCopy = useCallback(async () => {
    await terminalSurfaceRef.current?.copySelection()
  }, [])
  const handlePaste = useCallback(async () => {
    await terminalSurfaceRef.current?.pasteFromClipboard()
  }, [])
  const handleSearchNext = useCallback(() => {
    if (searchQuery.trim() === '') {
      return
    }
    terminalSurfaceRef.current?.findNext(searchQuery)
  }, [searchQuery])
  const handleSearchPrevious = useCallback(() => {
    if (searchQuery.trim() === '') {
      return
    }
    terminalSurfaceRef.current?.findPrevious(searchQuery)
  }, [searchQuery])
  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true)
  }, [])
  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((currentValue) => !currentValue)
  }, [])
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false)
    terminalSurfaceRef.current?.focus()
  }, [])

  return (
    <RunaDomScopeProvider component="terminal-widget" widget={hostId}>
      <ClearBox
        data-runa-terminal-root=""
        ref={terminalRootRef}
        runaComponent="terminal-widget-root"
        style={terminalWidgetRootStyle}
      >
        <ClearBox runaComponent="terminal-widget-chrome" style={terminalWidgetChromeStyle}>
          <TerminalStatusHeader
            connectionKind={terminalSession.connectionKind}
            cwd={terminalSession.cwd}
            primaryText={terminalSession.cwd}
            sessionState={terminalSession.sessionState}
            shellLabel={terminalSession.shellLabel}
            title={title}
          />
          <TerminalToolbar
            isSearchOpen={isSearchOpen}
            onCloseSearch={handleCloseSearch}
            onCopy={() => void handleCopy()}
            onPaste={() => void handlePaste()}
            onSearchNext={handleSearchNext}
            onSearchPrevious={handleSearchPrevious}
            onSearchQueryChange={setSearchQuery}
            onToggleSearch={handleToggleSearch}
            rendererMode={rendererMode}
            searchQuery={searchQuery}
          />
        </ClearBox>
        <ClearBox runaComponent="terminal-widget-surface-wrap" style={terminalWidgetSurfaceWrapStyle}>
          <TerminalSurface
            hostId={hostId}
            onInput={terminalSession.canSendInput ? terminalSession.sendInputChunk : undefined}
            onRendererModeChange={setRendererMode}
            onRequestSearch={handleOpenSearch}
            outputChunks={terminalSession.outputChunks}
            ref={terminalSurfaceRef}
            sessionKey={terminalSession.sessionKey}
            sessionState={terminalSession.sessionState}
            statusMessage={terminalSession.statusDetail}
            themeClassTarget={themeClassTarget}
          />
        </ClearBox>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
