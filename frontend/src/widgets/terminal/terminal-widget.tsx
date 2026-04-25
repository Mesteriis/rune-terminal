import { LoaderCircle, RotateCcw, Square } from 'lucide-react'
import { useCallback, useState, useRef } from 'react'

import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { ClearBox, IconButton } from '@/shared/ui/components'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { TerminalStatusHeader } from '@/shared/ui/components/terminal-status-header'
import { TerminalSurface, type TerminalSurfaceHandle } from '@/shared/ui/components/terminal-surface'
import { TerminalToolbar } from '@/shared/ui/components/terminal-toolbar'
import {
  terminalWidgetChromeStyle,
  terminalWidgetHeaderActionButtonStyle,
  terminalWidgetHeaderActionsStyle,
  terminalWidgetHeaderRowStyle,
  terminalWidgetRootStyle,
  terminalWidgetSurfaceWrapStyle,
  terminalWidgetToolbarRowStyle,
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
  const { fontSize, lineHeight, scrollback, themeMode } = useTerminalPreferences()
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
  const handleClear = useCallback(() => {
    terminalSurfaceRef.current?.clearViewport()
  }, [])
  const handleJumpToLatest = useCallback(() => {
    terminalSurfaceRef.current?.jumpToLatest()
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
  const handleRestart = useCallback(() => {
    void terminalSession.restartSession()
  }, [terminalSession])
  const handleInterrupt = useCallback(() => {
    void terminalSession.interruptSession()
  }, [terminalSession])
  const isRestartDisabled =
    terminalSession.isLoading || terminalSession.isInterrupting || terminalSession.isRestarting
  const isInterruptDisabled =
    terminalSession.isLoading ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting ||
    !terminalSession.canInterrupt
  const RestartIcon = terminalSession.isRestarting ? LoaderCircle : RotateCcw
  const InterruptIcon = terminalSession.isInterrupting ? LoaderCircle : Square

  return (
    <RunaDomScopeProvider component="terminal-widget" widget={hostId}>
      <ClearBox
        data-runa-terminal-root=""
        ref={terminalRootRef}
        runaComponent="terminal-widget-root"
        style={terminalWidgetRootStyle}
      >
        <ClearBox runaComponent="terminal-widget-chrome" style={terminalWidgetChromeStyle}>
          <ClearBox runaComponent="terminal-widget-header-row" style={terminalWidgetHeaderRowStyle}>
            <TerminalStatusHeader
              actionSlot={
                <ClearBox
                  runaComponent="terminal-widget-header-actions"
                  style={terminalWidgetHeaderActionsStyle}
                >
                  <IconButton
                    aria-label={`Interrupt terminal for ${title}`}
                    disabled={isInterruptDisabled}
                    onClick={handleInterrupt}
                    runaComponent="terminal-widget-interrupt"
                    size="sm"
                    style={{
                      ...terminalWidgetHeaderActionButtonStyle,
                      ...(isInterruptDisabled
                        ? {
                            cursor: 'default',
                            opacity: 0.58,
                          }
                        : null),
                    }}
                    title={terminalSession.isInterrupting ? 'Interrupting terminal…' : 'Interrupt terminal'}
                  >
                    <InterruptIcon
                      size={12}
                      strokeWidth={2}
                      style={
                        terminalSession.isInterrupting
                          ? { animation: 'runa-terminal-spin 1.2s linear infinite' }
                          : undefined
                      }
                    />
                  </IconButton>
                  <IconButton
                    aria-label={`Restart terminal for ${title}`}
                    disabled={isRestartDisabled}
                    onClick={handleRestart}
                    runaComponent="terminal-widget-restart"
                    size="sm"
                    style={{
                      ...terminalWidgetHeaderActionButtonStyle,
                      ...(isRestartDisabled
                        ? {
                            cursor: 'default',
                            opacity: 0.58,
                          }
                        : null),
                    }}
                    title={terminalSession.isRestarting ? 'Restarting terminal…' : 'Restart terminal'}
                  >
                    <RestartIcon
                      size={14}
                      strokeWidth={1.8}
                      style={
                        terminalSession.isRestarting
                          ? { animation: 'runa-terminal-spin 1.2s linear infinite' }
                          : undefined
                      }
                    />
                  </IconButton>
                </ClearBox>
              }
              connectionKind={terminalSession.connectionKind}
              cwd={terminalSession.cwd}
              primaryText={terminalSession.cwd}
              secondaryText={terminalSession.cwd.trim() !== '' ? title : undefined}
              sessionState={terminalSession.sessionState}
              shellLabel={terminalSession.shellLabel}
              title={title}
            />
          </ClearBox>
          <ClearBox runaComponent="terminal-widget-toolbar-row" style={terminalWidgetToolbarRowStyle}>
            <TerminalToolbar
              isSearchOpen={isSearchOpen}
              onClear={handleClear}
              onCloseSearch={handleCloseSearch}
              onCopy={() => void handleCopy()}
              onJumpToLatest={handleJumpToLatest}
              onPaste={() => void handlePaste()}
              onSearchNext={handleSearchNext}
              onSearchPrevious={handleSearchPrevious}
              onSearchQueryChange={setSearchQuery}
              onToggleSearch={handleToggleSearch}
              rendererMode={rendererMode}
              searchQuery={searchQuery}
            />
          </ClearBox>
        </ClearBox>
        <ClearBox runaComponent="terminal-widget-surface-wrap" style={terminalWidgetSurfaceWrapStyle}>
          <TerminalSurface
            fontSize={fontSize}
            hostId={hostId}
            lineHeight={lineHeight}
            onInput={terminalSession.canSendInput ? terminalSession.sendInputChunk : undefined}
            onRendererModeChange={setRendererMode}
            onRequestSearch={handleOpenSearch}
            outputChunks={terminalSession.outputChunks}
            ref={terminalSurfaceRef}
            scrollback={scrollback}
            sessionKey={terminalSession.sessionKey}
            sessionState={terminalSession.sessionState}
            statusMessage={terminalSession.statusDetail}
            themeClassTarget={themeClassTarget}
            themeMode={themeMode}
          />
        </ClearBox>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
