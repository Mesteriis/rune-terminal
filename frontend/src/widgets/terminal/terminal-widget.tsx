import { LoaderCircle, Plus, RotateCcw, Sparkles, Square } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { fetchTerminalDiagnostics } from '@/features/terminal/api/client'
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
  terminalWidgetSessionBrowserFilterStyle,
  terminalWidgetSessionBrowserListStyle,
  terminalWidgetSessionBrowserStyle,
  terminalWidgetSessionCardActionsStyle,
  terminalWidgetSessionCardHeaderStyle,
  terminalWidgetSessionCardMetaRowStyle,
  terminalWidgetSessionCardStyle,
  terminalWidgetSessionButtonActiveStyle,
  terminalWidgetSessionButtonStyle,
  terminalWidgetSessionMetaStyle,
  terminalWidgetSessionRailStyle,
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
  const [isExplainAndFixPending, setIsExplainAndFixPending] = useState(false)
  const [isSessionBrowserOpen, setIsSessionBrowserOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [rendererMode, setRendererMode] = useState<'default' | 'webgl'>('default')
  const [sessionFilterQuery, setSessionFilterQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<TerminalSearchResult | null>(null)
  const terminalSession = useTerminalSession({
    runtimeWidgetId,
    title,
  })
  const groupedSessions = terminalSession.sessions ?? []
  const visibleGroupedSessions = useMemo(() => {
    const filter = sessionFilterQuery.trim().toLowerCase()

    if (filter === '') {
      return groupedSessions
    }

    return groupedSessions.filter((session, index) =>
      [
        `session ${index + 1}`,
        session.cwd,
        session.shellLabel,
        session.sessionState,
        session.connectionName ?? '',
        session.remoteSessionName ?? '',
        session.remoteLaunchMode ?? '',
      ].some((field) => field.toLowerCase().includes(filter)),
    )
  }, [groupedSessions, sessionFilterQuery])
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
  const terminalIssueSummary =
    terminalSession.error?.trim() ||
    (terminalSession.sessionState !== 'running'
      ? terminalSession.statusDetail?.trim() || terminalSession.sessionState
      : '')
  const canExplainAndFix =
    terminalIssueSummary !== '' ||
    terminalSession.outputChunks.length > 0 ||
    terminalSession.statusDetail?.trim() !== ''
  const handleExplainAndFix = useCallback(async () => {
    setIsExplainAndFixPending(true)
    try {
      const diagnostics = await fetchTerminalDiagnostics(runtimeWidgetId)
      const promptSections = [
        'Проверь и помоги объяснить и исправить последнюю ошибку в этом терминале.',
        `Terminal: ${title}`,
        `Connection: ${terminalSession.connectionKind === 'ssh' ? 'SSH' : 'Local'}`,
        `Shell: ${terminalSession.shellLabel}`,
      ]
      const diagnosticsIssueSummary = diagnostics.issue_summary?.trim() ?? ''
      const diagnosticsStatusDetail = diagnostics.status_detail?.trim() ?? ''
      const diagnosticsOutputExcerpt = diagnostics.output_excerpt?.trim() ?? ''

      if (diagnosticsIssueSummary !== '') {
        promptSections.push(`Current issue: ${diagnosticsIssueSummary}`)
      }
      if (diagnosticsStatusDetail !== '' && diagnosticsStatusDetail !== diagnosticsIssueSummary) {
        promptSections.push(`Runtime status: ${diagnosticsStatusDetail}`)
      }
      if (diagnosticsOutputExcerpt !== '') {
        promptSections.push(`Recent terminal output:\n\`\`\`text\n${diagnosticsOutputExcerpt}\n\`\`\``)
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
    } finally {
      setIsExplainAndFixPending(false)
    }
  }, [runtimeWidgetId, terminalSession.connectionKind, terminalSession.shellLabel, title])
  const isRestartDisabled =
    terminalSession.isLoading || terminalSession.isInterrupting || terminalSession.isRestarting
  const isCreateSessionDisabled =
    terminalSession.isLoading ||
    terminalSession.isCreatingSession ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting
  const isInterruptDisabled =
    terminalSession.isLoading ||
    terminalSession.isCreatingSession ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting ||
    !terminalSession.canInterrupt
  const RestartIcon = terminalSession.isRestarting ? LoaderCircle : RotateCcw
  const InterruptIcon = terminalSession.isInterrupting ? LoaderCircle : Square
  const isExplainAndFixDisabled = !canExplainAndFix || isExplainAndFixPending
  const isSessionMutationDisabled =
    terminalSession.isLoading ||
    terminalSession.isCreatingSession ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting

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
                    aria-label={`Create another terminal session for ${title}`}
                    disabled={isCreateSessionDisabled}
                    onClick={() => {
                      void terminalSession.createSession()
                    }}
                    runaComponent="terminal-widget-create-session"
                    style={{
                      ...terminalWidgetAiActionButtonStyle,
                      ...(isCreateSessionDisabled
                        ? {
                            cursor: 'default',
                            opacity: 0.58,
                          }
                        : null),
                    }}
                    title="Create a new backend-owned session inside this terminal widget"
                  >
                    <Plus size={13} strokeWidth={1.8} />
                    {terminalSession.isCreatingSession ? 'Creating…' : 'New session'}
                  </Button>
                  {groupedSessions.length > 1 ? (
                    <Button
                      aria-label={`Browse grouped terminal sessions for ${title}`}
                      onClick={() => {
                        setIsSessionBrowserOpen((currentValue) => !currentValue)
                        if (isSessionBrowserOpen) {
                          setSessionFilterQuery('')
                        }
                      }}
                      runaComponent="terminal-widget-browse-sessions"
                      style={terminalWidgetAiActionButtonStyle}
                      title="Inspect, filter, focus, or close grouped sessions in this terminal widget"
                    >
                      {isSessionBrowserOpen ? 'Hide sessions' : 'Browse sessions'}
                    </Button>
                  ) : null}
                  <Button
                    aria-label={`Explain and fix the latest terminal issue for ${title}`}
                    disabled={isExplainAndFixDisabled}
                    onClick={() => {
                      void handleExplainAndFix()
                    }}
                    runaComponent="terminal-widget-explain-fix"
                    style={{
                      ...terminalWidgetAiActionButtonStyle,
                      ...(isExplainAndFixDisabled
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
                    {isExplainAndFixPending ? 'Loading…' : 'Explain & fix'}
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
          {groupedSessions.length > 1 ? (
            <ClearBox runaComponent="terminal-widget-session-rail" style={terminalWidgetSessionRailStyle}>
              {groupedSessions.map((session, index) => (
                <Button
                  aria-label={`Focus terminal session ${index + 1} for ${title}`}
                  disabled={session.isActive || terminalSession.isLoading || terminalSession.isRestarting}
                  key={session.sessionId}
                  onClick={() => {
                    void terminalSession.focusSession(session.sessionId)
                  }}
                  runaComponent="terminal-widget-session-button"
                  style={{
                    ...terminalWidgetSessionButtonStyle,
                    ...(session.isActive ? terminalWidgetSessionButtonActiveStyle : null),
                    ...(session.isActive || terminalSession.isLoading || terminalSession.isRestarting
                      ? {
                          cursor: session.isActive ? 'default' : 'progress',
                        }
                      : null),
                  }}
                  title={session.cwd}
                >
                  <span>{`Session ${index + 1}`}</span>
                  <span style={terminalWidgetSessionMetaStyle}>
                    {session.sessionState === 'running' ? session.shellLabel : session.sessionState}
                  </span>
                </Button>
              ))}
            </ClearBox>
          ) : null}
          {groupedSessions.length > 1 && isSessionBrowserOpen ? (
            <ClearBox
              runaComponent="terminal-widget-session-browser"
              style={terminalWidgetSessionBrowserStyle}
            >
              <input
                aria-label="Filter grouped terminal sessions"
                onChange={(event) => setSessionFilterQuery(event.target.value)}
                placeholder="Filter sessions by cwd, shell, or tmux target"
                style={terminalWidgetSessionBrowserFilterStyle}
                value={sessionFilterQuery}
              />
              <ClearBox
                runaComponent="terminal-widget-session-browser-list"
                style={terminalWidgetSessionBrowserListStyle}
              >
                {visibleGroupedSessions.map((session, index) => (
                  <ClearBox
                    key={session.sessionId}
                    runaComponent="terminal-widget-session-card"
                    style={terminalWidgetSessionCardStyle}
                  >
                    <ClearBox style={terminalWidgetSessionCardHeaderStyle}>
                      <strong>{`Session ${groupedSessions.findIndex((item) => item.sessionId === session.sessionId) + 1}`}</strong>
                      <span style={terminalWidgetSessionMetaStyle}>
                        {session.isActive ? 'active' : session.sessionState}
                      </span>
                    </ClearBox>
                    <span>{session.cwd}</span>
                    <ClearBox style={terminalWidgetSessionCardMetaRowStyle}>
                      <span style={terminalWidgetSessionMetaStyle}>{session.shellLabel}</span>
                      <span style={terminalWidgetSessionMetaStyle}>
                        {session.connectionKind === 'ssh' ? 'SSH' : 'Local'}
                      </span>
                      {session.connectionName ? (
                        <span style={terminalWidgetSessionMetaStyle}>{session.connectionName}</span>
                      ) : null}
                      {session.remoteSessionName ? (
                        <span
                          style={terminalWidgetSessionMetaStyle}
                        >{`tmux:${session.remoteSessionName}`}</span>
                      ) : null}
                    </ClearBox>
                    <ClearBox style={terminalWidgetSessionCardActionsStyle}>
                      <Button
                        aria-label={`Focus terminal session ${index + 1} from browser for ${title}`}
                        disabled={session.isActive || isSessionMutationDisabled}
                        onClick={() => {
                          void terminalSession.focusSession(session.sessionId)
                        }}
                      >
                        Focus
                      </Button>
                      <Button
                        aria-label={`Close terminal session ${index + 1} for ${title}`}
                        disabled={groupedSessions.length <= 1 || isSessionMutationDisabled}
                        onClick={() => {
                          void terminalSession.closeSession(session.sessionId)
                        }}
                      >
                        Close
                      </Button>
                    </ClearBox>
                  </ClearBox>
                ))}
                {visibleGroupedSessions.length === 0 ? (
                  <span style={terminalWidgetSessionMetaStyle}>
                    No grouped sessions match the current filter.
                  </span>
                ) : null}
              </ClearBox>
            </ClearBox>
          ) : null}
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
