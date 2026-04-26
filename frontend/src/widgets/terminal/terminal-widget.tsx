import { LoaderCircle, RotateCcw, Sparkles, Square } from 'lucide-react'
import { useCallback, useState, useRef } from 'react'

import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { openAiSidebar } from '@/shared/model/app'
import { queueAiPromptHandoff } from '@/shared/model/ai-handoff'
import { ClearBox, IconButton } from '@/shared/ui/components'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Button } from '@/shared/ui/primitives'
import { TerminalStatusHeader } from '@/shared/ui/components/terminal-status-header'
import {
  TerminalSurface,
  type TerminalSearchResult,
  type TerminalSurfaceHandle,
} from '@/shared/ui/components/terminal-surface'
import { TerminalToolbar } from '@/shared/ui/components/terminal-toolbar'
import {
  terminalWidgetChromeStyle,
  terminalWidgetAiActionButtonStyle,
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
  const { cursorBlink, cursorStyle, fontSize, lineHeight, scrollback, themeMode } = useTerminalPreferences()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [rendererMode, setRendererMode] = useState<'default' | 'webgl'>('default')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<TerminalSearchResult | null>(null)
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
      setSearchResult(null)
      return
    }
    const didFindMatch = terminalSurfaceRef.current?.findNext(searchQuery) ?? false
    if (!didFindMatch) {
      setSearchResult({ resultCount: 0, resultIndex: -1 })
    }
  }, [searchQuery])
  const handleSearchPrevious = useCallback(() => {
    if (searchQuery.trim() === '') {
      setSearchResult(null)
      return
    }
    const didFindMatch = terminalSurfaceRef.current?.findPrevious(searchQuery) ?? false
    if (!didFindMatch) {
      setSearchResult({ resultCount: 0, resultIndex: -1 })
    }
  }, [searchQuery])
  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value)
    setSearchResult(null)

    if (value.trim() === '') {
      terminalSurfaceRef.current?.clearSearch()
    }
  }, [])
  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true)
  }, [])
  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((currentValue) => !currentValue)
  }, [])
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false)
    setSearchResult(null)
    terminalSurfaceRef.current?.clearSearch()
    terminalSurfaceRef.current?.focus()
  }, [])
  const handleRestart = useCallback(() => {
    void terminalSession.restartSession()
  }, [terminalSession])
  const handleInterrupt = useCallback(() => {
    void terminalSession.interruptSession()
  }, [terminalSession])
  const latestOutputExcerpt = terminalSession.outputChunks
    .map((chunk) => chunk.data)
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(-1800)
  const terminalIssueSummary =
    terminalSession.error?.trim() ||
    (terminalSession.sessionState !== 'running'
      ? terminalSession.statusDetail?.trim() || terminalSession.sessionState
      : '')
  const canExplainAndFix =
    terminalIssueSummary !== '' || latestOutputExcerpt !== '' || terminalSession.statusDetail?.trim() !== ''
  const handleExplainAndFix = useCallback(() => {
    const promptSections = [
      'Проверь и помоги объяснить и исправить последнюю ошибку в этом терминале.',
      `Terminal: ${title}`,
      `Connection: ${terminalSession.connectionKind === 'ssh' ? 'SSH' : 'Local'}`,
      `Shell: ${terminalSession.shellLabel}`,
    ]

    if (terminalIssueSummary) {
      promptSections.push(`Current issue: ${terminalIssueSummary}`)
    }
    if (terminalSession.statusDetail?.trim()) {
      promptSections.push(`Runtime status: ${terminalSession.statusDetail.trim()}`)
    }
    if (latestOutputExcerpt !== '') {
      promptSections.push(`Recent terminal output:\n\`\`\`text\n${latestOutputExcerpt}\n\`\`\``)
    }

    promptSections.push(
      'Если для исправления нужны команды, сначала спланируй их и выполняй только в этом терминале после approval.',
    )

    queueAiPromptHandoff({
      context_widget_ids: [runtimeWidgetId],
      prompt: promptSections.join('\n\n'),
      submit: true,
    })
    openAiSidebar()
  }, [
    latestOutputExcerpt,
    runtimeWidgetId,
    terminalIssueSummary,
    terminalSession.connectionKind,
    terminalSession.shellLabel,
    terminalSession.statusDetail,
    title,
  ])
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
                  <Button
                    aria-label={`Explain and fix the latest terminal issue for ${title}`}
                    disabled={!canExplainAndFix}
                    onClick={handleExplainAndFix}
                    runaComponent="terminal-widget-explain-fix"
                    style={{
                      ...terminalWidgetAiActionButtonStyle,
                      ...(!canExplainAndFix
                        ? {
                            cursor: 'default',
                            opacity: 0.58,
                          }
                        : null),
                    }}
                    title={
                      canExplainAndFix
                        ? 'Open AI and explain/fix the latest visible terminal issue'
                        : 'No terminal issue or output is available yet'
                    }
                  >
                    <Sparkles size={13} strokeWidth={1.8} />
                    Explain & fix
                  </Button>
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
              onSearchQueryChange={handleSearchQueryChange}
              onToggleSearch={handleToggleSearch}
              rendererMode={rendererMode}
              searchQuery={searchQuery}
              searchResult={searchResult}
            />
          </ClearBox>
        </ClearBox>
        <ClearBox runaComponent="terminal-widget-surface-wrap" style={terminalWidgetSurfaceWrapStyle}>
          <TerminalSurface
            cursorBlink={cursorBlink}
            cursorStyle={cursorStyle}
            fontSize={fontSize}
            hostId={hostId}
            lineHeight={lineHeight}
            onInput={terminalSession.canSendInput ? terminalSession.sendInputChunk : undefined}
            onRendererModeChange={setRendererMode}
            onRequestSearch={handleOpenSearch}
            onSearchResultsChange={setSearchResult}
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
