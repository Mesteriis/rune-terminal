import { LoaderCircle, Plus, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useAppTheme } from '@/features/theme/model/theme-provider'
import type { TerminalSessionListEntry } from '@/features/terminal/model/types'
import {
  fetchTerminalDiagnostics,
  fetchTerminalLatestCommand,
  sendTerminalInput,
  TerminalAPIError,
  type TerminalLatestCommand,
} from '@/features/terminal/api/client'
import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { openAiSidebar } from '@/shared/model/app'
import { queueAiPromptHandoff } from '@/shared/model/ai-handoff'
import { resolveLocalizedCopy } from '@/features/i18n/model/localized-copy'
import { ClearBox, IconButton } from '@/shared/ui/components'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Button, Text } from '@/shared/ui/primitives'
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
  terminalWidgetCommandActionsStyle,
  terminalWidgetCommandExcerptStyle,
  terminalWidgetCommandStripHeaderStyle,
  terminalWidgetCommandStripMetaStyle,
  terminalWidgetCommandStripStyle,
  terminalWidgetCommandValueStyle,
  terminalWidgetHeaderActionGroupStyle,
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
  terminalWidgetSessionCloseButtonStyle,
  terminalWidgetSessionLabelStyle,
  terminalWidgetSessionMetaStyle,
  terminalWidgetSessionRailStyle,
  terminalWidgetSessionShellBadgeStyle,
  terminalWidgetSessionTabStyle,
  terminalWidgetSurfaceWrapStyle,
  terminalWidgetToolbarRowStyle,
} from '@/widgets/terminal/terminal-widget.styles'
import { terminalWidgetCopy } from '@/widgets/terminal/terminal-widget-copy'
import {
  clearTerminalDockviewHeaderControls,
  setTerminalDockviewHeaderControls,
} from '@/widgets/terminal/terminal-dockview-header-controls'

export type TerminalWidgetProps = {
  hostId: string
  preferDockviewHeaderChrome?: boolean
  runtimeWidgetId: string
  title: string
  themeClassTarget?: HTMLElement | null
}

type TerminalSessionTab = Pick<
  TerminalSessionListEntry,
  'cwd' | 'isActive' | 'sessionId' | 'sessionState' | 'shellLabel'
>

export function TerminalWidget({
  hostId,
  preferDockviewHeaderChrome = false,
  runtimeWidgetId,
  title,
  themeClassTarget = null,
}: TerminalWidgetProps) {
  const terminalRootRef = useRunaDomAutoTagging('terminal-widget-root')
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null)
  const { locale } = useAppLocale()
  const { resolvedTheme } = useAppTheme()
  const copy = resolveLocalizedCopy(terminalWidgetCopy, locale)
  const { cursorBlink, cursorStyle, fontSize, lineHeight, scrollback, themeMode } = useTerminalPreferences()
  const [isExplainAndFixPending, setIsExplainAndFixPending] = useState(false)
  const [isExplainLatestCommandPending, setIsExplainLatestCommandPending] = useState(false)
  const [isLatestCommandLoading, setIsLatestCommandLoading] = useState(false)
  const [isRerunLatestCommandPending, setIsRerunLatestCommandPending] = useState(false)
  const [isSessionBrowserOpen, setIsSessionBrowserOpen] = useState(false)
  const [isLatestCommandStripOpen, setIsLatestCommandStripOpen] = useState(false)
  const [latestCommand, setLatestCommand] = useState<TerminalLatestCommand | null>(null)
  const [latestCommandError, setLatestCommandError] = useState<string | null>(null)
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
  const visibleSessionTabs = useMemo<TerminalSessionTab[]>(() => {
    if (groupedSessions.length > 0) {
      return groupedSessions
    }

    return [
      {
        cwd: terminalSession.cwd,
        isActive: true,
        sessionId: terminalSession.activeSessionId ?? runtimeWidgetId,
        sessionState: terminalSession.sessionState,
        shellLabel: terminalSession.shellLabel,
      },
    ]
  }, [
    groupedSessions,
    runtimeWidgetId,
    terminalSession.activeSessionId,
    terminalSession.cwd,
    terminalSession.sessionState,
    terminalSession.shellLabel,
  ])
  const latestOutputSeq = terminalSession.outputChunks[terminalSession.outputChunks.length - 1]?.seq ?? 0
  const hasLatestCommandPreview =
    latestCommand !== null || isLatestCommandLoading || latestCommandError != null
  const refreshLatestCommand = useCallback(async () => {
    setIsLatestCommandLoading(true)

    try {
      const latestCommandResult = await fetchTerminalLatestCommand(runtimeWidgetId)
      setLatestCommand(latestCommandResult)
      setLatestCommandError(null)
    } catch (error) {
      if (error instanceof TerminalAPIError && error.code === 'terminal_command_not_found') {
        setLatestCommand(null)
        setLatestCommandError(null)
        return
      }

      setLatestCommand(null)
      setLatestCommandError(
        error instanceof Error && error.message.trim() ? error.message : copy.latestCommandLoadError,
      )
    } finally {
      setIsLatestCommandLoading(false)
    }
  }, [copy.latestCommandLoadError, runtimeWidgetId])

  useEffect(() => {
    const refreshDelay = terminalSession.commandInputVersion > 0 ? 40 : 180
    const refreshTimer = window.setTimeout(() => {
      void refreshLatestCommand()
    }, refreshDelay)

    return () => {
      window.clearTimeout(refreshTimer)
    }
  }, [latestOutputSeq, refreshLatestCommand, terminalSession.commandInputVersion, terminalSession.sessionKey])
  useEffect(() => {
    if (!hasLatestCommandPreview) {
      setIsLatestCommandStripOpen(false)
    }
  }, [hasLatestCommandPreview])
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
        copy.explainAndFixPromptIntro,
        copy.responseLanguageInstruction,
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

      promptSections.push(copy.terminalCommandApprovalInstruction)

      queueAiPromptHandoff({
        context_widget_ids: [runtimeWidgetId],
        prompt: promptSections.join('\n\n'),
        submit: true,
      })
      openAiSidebar()
    } finally {
      setIsExplainAndFixPending(false)
    }
  }, [
    copy.explainAndFixPromptIntro,
    copy.responseLanguageInstruction,
    copy.terminalCommandApprovalInstruction,
    runtimeWidgetId,
    terminalSession.connectionKind,
    terminalSession.shellLabel,
    title,
  ])
  const handleExplainLatestCommand = useCallback(async () => {
    if (!latestCommand) {
      return
    }

    setIsExplainLatestCommandPending(true)
    try {
      const promptSections = [
        copy.explainLatestCommandPromptIntro,
        copy.responseLanguageInstruction,
        `Terminal: ${title}`,
        `Connection: ${terminalSession.connectionKind === 'ssh' ? 'SSH' : 'Local'}`,
        `Shell: ${terminalSession.shellLabel}`,
        `Command:\n\`\`\`sh\n${latestCommand.command}\n\`\`\``,
      ]

      if (latestCommand.status_detail?.trim()) {
        promptSections.push(`Runtime status: ${latestCommand.status_detail.trim()}`)
      }
      if (latestCommand.output_excerpt?.trim()) {
        promptSections.push(`Observed output:\n\`\`\`text\n${latestCommand.output_excerpt.trim()}\n\`\`\``)
      }
      if (latestCommand.explain_summary?.trim()) {
        promptSections.push(`Previous explain summary: ${latestCommand.explain_summary.trim()}`)
      }

      promptSections.push(copy.terminalCommandApprovalInstruction)

      queueAiPromptHandoff({
        context_widget_ids: [runtimeWidgetId],
        prompt: promptSections.join('\n\n'),
        submit: true,
      })
      openAiSidebar()
    } finally {
      setIsExplainLatestCommandPending(false)
    }
  }, [
    copy.explainLatestCommandPromptIntro,
    copy.responseLanguageInstruction,
    copy.terminalCommandApprovalInstruction,
    latestCommand,
    runtimeWidgetId,
    terminalSession.connectionKind,
    terminalSession.shellLabel,
    title,
  ])
  const handleRerunLatestCommand = useCallback(async () => {
    if (!latestCommand) {
      return
    }

    setIsRerunLatestCommandPending(true)
    setLatestCommandError(null)
    try {
      await sendTerminalInput(runtimeWidgetId, latestCommand.command, true)
      await refreshLatestCommand()
    } catch (error) {
      setLatestCommandError(
        error instanceof Error && error.message.trim() ? error.message : copy.rerunLatestCommandError,
      )
    } finally {
      setIsRerunLatestCommandPending(false)
    }
  }, [copy.rerunLatestCommandError, latestCommand, refreshLatestCommand, runtimeWidgetId])
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
  const canRecoverTerminal =
    terminalSession.isRecoveringStream ||
    terminalSession.error !== null ||
    terminalSession.sessionState === 'disconnected' ||
    terminalSession.sessionState === 'failed' ||
    terminalSession.sessionState === 'exited'
  const isRecoverDisabled =
    !canRecoverTerminal ||
    terminalSession.isLoading ||
    terminalSession.isCreatingSession ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting
  const recoverButtonLabel = terminalSession.isRecoveringStream
    ? copy.reconnectStream
    : terminalSession.connectionKind === 'ssh' &&
        terminalSession.runtimeState?.remote_launch_mode === 'tmux' &&
        terminalSession.sessionState !== 'running'
      ? copy.resumeSession
      : terminalSession.connectionKind === 'ssh' && terminalSession.sessionState !== 'running'
        ? copy.reconnectShell
        : copy.restartShell
  const RestartIcon = terminalSession.isRestarting ? LoaderCircle : RotateCcw
  const InterruptIcon = terminalSession.isInterrupting ? LoaderCircle : Square
  const isExplainAndFixDisabled = !canExplainAndFix || isExplainAndFixPending
  const isLatestCommandActionDisabled =
    latestCommand === null ||
    terminalSession.isLoading ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting
  const isSessionMutationDisabled =
    terminalSession.isLoading ||
    terminalSession.isCreatingSession ||
    terminalSession.isInterrupting ||
    terminalSession.isRestarting
  const isSessionCloseDisabled = visibleSessionTabs.length <= 1 || isSessionMutationDisabled
  useEffect(() => {
    if (!preferDockviewHeaderChrome) {
      clearTerminalDockviewHeaderControls(hostId)
      return
    }

    setTerminalDockviewHeaderControls(hostId, {
      createSession: {
        ariaLabel: copy.createSessionAria(title),
        disabled: isCreateSessionDisabled,
        label: terminalSession.isCreatingSession ? copy.creatingSession : copy.newSession,
        onClick: () => {
          void terminalSession.createSession()
        },
        title: copy.createSessionTitle,
      },
      explain: {
        ariaLabel: copy.explainAndFixAria(title),
        disabled: isExplainAndFixDisabled,
        label: isExplainAndFixPending ? copy.explainAndFixLoading : copy.explainAndFix,
        onClick: () => {
          void handleExplainAndFix()
        },
        title: canExplainAndFix ? copy.explainAndFixTitle : copy.explainAndFixUnavailableTitle,
        tone: 'accent',
      },
      interrupt: {
        ariaLabel: copy.interruptAria(title),
        disabled: isInterruptDisabled,
        onClick: handleInterrupt,
        title: terminalSession.isInterrupting ? copy.interruptingTitle : copy.interruptTitle,
      },
      recover: canRecoverTerminal
        ? {
            ariaLabel: copy.recoverSessionAria(title),
            disabled: isRecoverDisabled,
            label: recoverButtonLabel,
            onClick: () => {
              void terminalSession.recoverSession()
            },
            title: terminalSession.isRecoveringStream
              ? copy.recoverStreamTitle
              : terminalSession.connectionKind === 'ssh'
                ? copy.recoverSSHTitle
                : copy.recoverLocalTitle,
          }
        : null,
      restart: {
        ariaLabel: copy.restartAria(title),
        disabled: isRestartDisabled,
        onClick: handleRestart,
        title: terminalSession.isRestarting ? copy.restartingTitle : copy.restartTitle,
      },
      toolbar: {
        isSearchOpen,
        onClear: handleClear,
        onCloseSearch: handleCloseSearch,
        onCopy: () => {
          void handleCopy()
        },
        onJumpToLatest: handleJumpToLatest,
        onPaste: () => {
          void handlePaste()
        },
        onSearchNext: handleSearchNext,
        onSearchPrevious: handleSearchPrevious,
        onSearchQueryChange: handleSearchQueryChange,
        onToggleSearch: handleToggleSearch,
        searchQuery,
        searchResult,
      },
    })

    return () => {
      clearTerminalDockviewHeaderControls(hostId)
    }
  }, [
    canExplainAndFix,
    canRecoverTerminal,
    copy,
    handleClear,
    handleCloseSearch,
    handleCopy,
    handleExplainAndFix,
    handleInterrupt,
    handleJumpToLatest,
    handlePaste,
    handleRestart,
    handleSearchNext,
    handleSearchPrevious,
    handleSearchQueryChange,
    handleToggleSearch,
    hostId,
    isExplainAndFixDisabled,
    isExplainAndFixPending,
    isInterruptDisabled,
    isCreateSessionDisabled,
    isRecoverDisabled,
    isRestartDisabled,
    isSearchOpen,
    preferDockviewHeaderChrome,
    recoverButtonLabel,
    searchQuery,
    searchResult,
    terminalSession.connectionKind,
    terminalSession.isCreatingSession,
    terminalSession.isInterrupting,
    terminalSession.isRecoveringStream,
    terminalSession.isRestarting,
    title,
  ])

  return (
    <RunaDomScopeProvider component="terminal-widget" widget={hostId}>
      <ClearBox
        data-runa-terminal-root=""
        ref={terminalRootRef}
        runaComponent="terminal-widget-root"
        style={terminalWidgetRootStyle}
      >
        <ClearBox runaComponent="terminal-widget-chrome" style={terminalWidgetChromeStyle}>
          {preferDockviewHeaderChrome ? null : (
            <ClearBox runaComponent="terminal-widget-header-row" style={terminalWidgetHeaderRowStyle}>
              <TerminalStatusHeader
                actionSlot={
                  <ClearBox
                    runaComponent="terminal-widget-header-actions"
                    style={terminalWidgetHeaderActionsStyle}
                  >
                    <ClearBox
                      runaComponent="terminal-widget-header-session-actions"
                      style={terminalWidgetHeaderActionGroupStyle}
                    >
                      <Button
                        aria-label={copy.createSessionAria(title)}
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
                        title={copy.createSessionTitle}
                      >
                        <Plus size={13} strokeWidth={1.8} />
                        {terminalSession.isCreatingSession ? copy.creatingSession : copy.newSession}
                      </Button>
                    </ClearBox>
                    {canRecoverTerminal ? (
                      <Button
                        aria-label={copy.recoverSessionAria(title)}
                        disabled={isRecoverDisabled}
                        onClick={() => {
                          void terminalSession.recoverSession()
                        }}
                        runaComponent="terminal-widget-recover-session"
                        style={{
                          ...terminalWidgetAiActionButtonStyle,
                          ...(isRecoverDisabled
                            ? {
                                cursor: 'default',
                                opacity: 0.58,
                              }
                            : null),
                        }}
                        title={
                          terminalSession.isRecoveringStream
                            ? copy.recoverStreamTitle
                            : terminalSession.connectionKind === 'ssh'
                              ? copy.recoverSSHTitle
                              : copy.recoverLocalTitle
                        }
                      >
                        <RotateCcw
                          size={13}
                          strokeWidth={1.8}
                          style={
                            terminalSession.isRecoveringStream
                              ? { animation: 'runa-terminal-spin 1.2s linear infinite' }
                              : undefined
                          }
                        />
                        {recoverButtonLabel}
                      </Button>
                    ) : null}
                    {groupedSessions.length > 1 ? (
                      <Button
                        aria-label={copy.browseSessionsAria(title)}
                        onClick={() => {
                          setIsSessionBrowserOpen((currentValue) => !currentValue)
                          if (isSessionBrowserOpen) {
                            setSessionFilterQuery('')
                          }
                        }}
                        runaComponent="terminal-widget-browse-sessions"
                        style={terminalWidgetAiActionButtonStyle}
                        title={copy.browseSessionsTitle}
                      >
                        {isSessionBrowserOpen ? copy.hideSessions : copy.browseSessions}
                      </Button>
                    ) : null}
                    {hasLatestCommandPreview ? (
                      <Button
                        aria-expanded={isLatestCommandStripOpen}
                        aria-label={`${isLatestCommandStripOpen ? 'Hide' : 'Show'} latest command for ${title}`}
                        onClick={() => {
                          setIsLatestCommandStripOpen((currentValue) => !currentValue)
                        }}
                        runaComponent="terminal-widget-toggle-command-strip"
                        style={terminalWidgetAiActionButtonStyle}
                        title={copy.latestCommand}
                      >
                        {copy.latestCommand}
                      </Button>
                    ) : null}
                    <Button
                      aria-label={copy.explainAndFixAria(title)}
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
                      title={canExplainAndFix ? copy.explainAndFixTitle : copy.explainAndFixUnavailableTitle}
                    >
                      <Sparkles size={13} strokeWidth={1.8} />
                      {isExplainAndFixPending ? copy.explainAndFixLoading : copy.explainAndFix}
                    </Button>
                    <IconButton
                      aria-label={copy.interruptAria(title)}
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
                      title={terminalSession.isInterrupting ? copy.interruptingTitle : copy.interruptTitle}
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
                      aria-label={copy.restartAria(title)}
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
                      title={terminalSession.isRestarting ? copy.restartingTitle : copy.restartTitle}
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
                activeShell={terminalSession.runtimeState?.shell ?? null}
                connectionKind={terminalSession.connectionKind}
                cwd={terminalSession.cwd}
                isShellMenuDisabled={terminalSession.connectionKind !== 'local'}
                isShellMenuLoading={terminalSession.isLoadingShells}
                isShellSwitching={terminalSession.isSwitchingShell}
                onOpenShellMenu={terminalSession.loadShellOptions}
                onSelectShell={terminalSession.switchShell}
                primaryText={terminalSession.cwd}
                secondaryText={terminalSession.cwd.trim() !== '' ? title : undefined}
                sessionState={terminalSession.sessionState}
                shellOptions={terminalSession.shellOptions}
                shellLabel={terminalSession.shellLabel}
                title={title}
              />
            </ClearBox>
          )}
          {hasLatestCommandPreview && isLatestCommandStripOpen ? (
            <ClearBox runaComponent="terminal-widget-command-strip" style={terminalWidgetCommandStripStyle}>
              <ClearBox
                runaComponent="terminal-widget-command-strip-header"
                style={terminalWidgetCommandStripHeaderStyle}
              >
                <Text>{copy.latestCommand}</Text>
                <ClearBox style={terminalWidgetCommandStripMetaStyle}>
                  {latestCommand ? (
                    <>
                      <span>{latestCommand.status}</span>
                      {latestCommand.execution_block_id ? (
                        <span>{copy.aiLinked}</span>
                      ) : (
                        <span>{copy.terminalSource}</span>
                      )}
                    </>
                  ) : null}
                  {isLatestCommandLoading ? <span>{copy.refreshing}</span> : null}
                </ClearBox>
              </ClearBox>
              {latestCommand ? (
                <>
                  <pre style={terminalWidgetCommandValueStyle}>{latestCommand.command}</pre>
                  {latestCommand.output_excerpt?.trim() ? (
                    <Text style={terminalWidgetCommandExcerptStyle}>
                      {latestCommand.output_excerpt.trim()}
                    </Text>
                  ) : null}
                  {latestCommand.explain_summary?.trim() ? (
                    <Text style={terminalWidgetCommandExcerptStyle}>
                      {copy.lastExplain(latestCommand.explain_summary.trim())}
                    </Text>
                  ) : null}
                  <ClearBox
                    runaComponent="terminal-widget-command-actions"
                    style={terminalWidgetCommandActionsStyle}
                  >
                    <Button
                      aria-label={copy.explainCommandAria(title)}
                      disabled={isLatestCommandActionDisabled || isExplainLatestCommandPending}
                      onClick={() => {
                        void handleExplainLatestCommand()
                      }}
                      runaComponent="terminal-widget-explain-command"
                      style={terminalWidgetAiActionButtonStyle}
                    >
                      <Sparkles size={13} strokeWidth={1.8} />
                      {isExplainLatestCommandPending ? copy.explainingCommand : copy.explainCommand}
                    </Button>
                    <Button
                      aria-label={copy.rerunCommandAria(title)}
                      disabled={isLatestCommandActionDisabled || isRerunLatestCommandPending}
                      onClick={() => {
                        void handleRerunLatestCommand()
                      }}
                      runaComponent="terminal-widget-rerun-command"
                      style={terminalWidgetAiActionButtonStyle}
                    >
                      <RotateCcw size={13} strokeWidth={1.8} />
                      {isRerunLatestCommandPending ? copy.runningCommand : copy.rerun}
                    </Button>
                  </ClearBox>
                </>
              ) : latestCommandError ? (
                <Text style={terminalWidgetCommandExcerptStyle}>{latestCommandError}</Text>
              ) : (
                <Text style={terminalWidgetCommandExcerptStyle}>{copy.noCommandObserved}</Text>
              )}
            </ClearBox>
          ) : null}
          {visibleSessionTabs.length > 0 ? (
            <ClearBox runaComponent="terminal-widget-session-rail" style={terminalWidgetSessionRailStyle}>
              {visibleSessionTabs.map((session, index) => {
                const sessionLabel = copy.sessionLabel(index + 1)
                const sessionShellLabel =
                  session.sessionState === 'running' ? session.shellLabel : session.sessionState

                return (
                  <ClearBox
                    key={session.sessionId}
                    runaComponent="terminal-widget-session-tab"
                    style={{
                      ...terminalWidgetSessionTabStyle,
                      ...(session.isActive ? terminalWidgetSessionButtonActiveStyle : null),
                    }}
                    title={session.cwd}
                  >
                    <Button
                      aria-label={copy.focusSessionAria(index + 1, title)}
                      disabled={session.isActive || terminalSession.isLoading || terminalSession.isRestarting}
                      onClick={() => {
                        void terminalSession.focusSession(session.sessionId)
                      }}
                      runaComponent="terminal-widget-session-button"
                      style={{
                        ...terminalWidgetSessionButtonStyle,
                        ...(session.isActive || terminalSession.isLoading || terminalSession.isRestarting
                          ? {
                              cursor: session.isActive ? 'default' : 'progress',
                            }
                          : null),
                      }}
                    >
                      <span style={terminalWidgetSessionShellBadgeStyle}>{sessionShellLabel}</span>
                      <span style={terminalWidgetSessionLabelStyle}>{sessionLabel}</span>
                    </Button>
                    {visibleSessionTabs.length > 1 ? (
                      <IconButton
                        aria-label={copy.closeSessionTabAria(index + 1, title)}
                        disabled={isSessionCloseDisabled}
                        onClick={() => {
                          void terminalSession.closeSession(session.sessionId)
                        }}
                        runaComponent="terminal-widget-session-close"
                        size="sm"
                        style={{
                          ...terminalWidgetSessionCloseButtonStyle,
                          ...(isSessionCloseDisabled
                            ? {
                                cursor: 'default',
                                opacity: 0.58,
                              }
                            : null),
                        }}
                        title={copy.closeSession}
                      >
                        <X size={12} strokeWidth={2} />
                      </IconButton>
                    ) : null}
                  </ClearBox>
                )
              })}
            </ClearBox>
          ) : null}
          {groupedSessions.length > 1 && isSessionBrowserOpen ? (
            <ClearBox
              runaComponent="terminal-widget-session-browser"
              style={terminalWidgetSessionBrowserStyle}
            >
              <input
                aria-label={copy.filterSessionsAria}
                onChange={(event) => setSessionFilterQuery(event.target.value)}
                placeholder={copy.filterSessionsPlaceholder}
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
                      <strong>
                        {copy.sessionLabel(
                          groupedSessions.findIndex((item) => item.sessionId === session.sessionId) + 1,
                        )}
                      </strong>
                      <span style={terminalWidgetSessionMetaStyle}>
                        {session.isActive ? copy.activeSession : session.sessionState}
                      </span>
                    </ClearBox>
                    <span>{session.cwd}</span>
                    <ClearBox style={terminalWidgetSessionCardMetaRowStyle}>
                      <span style={terminalWidgetSessionMetaStyle}>{session.shellLabel}</span>
                      <span style={terminalWidgetSessionMetaStyle}>
                        {session.connectionKind === 'ssh' ? copy.connectionSSH : copy.connectionLocal}
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
                        aria-label={copy.focusSessionFromBrowserAria(index + 1, title)}
                        disabled={session.isActive || isSessionMutationDisabled}
                        onClick={() => {
                          void terminalSession.focusSession(session.sessionId)
                        }}
                      >
                        {copy.focusSession}
                      </Button>
                      <Button
                        aria-label={copy.closeSessionAria(index + 1, title)}
                        disabled={groupedSessions.length <= 1 || isSessionMutationDisabled}
                        onClick={() => {
                          void terminalSession.closeSession(session.sessionId)
                        }}
                      >
                        {copy.closeSession}
                      </Button>
                    </ClearBox>
                  </ClearBox>
                ))}
                {visibleGroupedSessions.length === 0 ? (
                  <span style={terminalWidgetSessionMetaStyle}>{copy.noSessionsMatch}</span>
                ) : null}
              </ClearBox>
            </ClearBox>
          ) : null}
          {preferDockviewHeaderChrome ? null : (
            <ClearBox runaComponent="terminal-widget-toolbar-row" style={terminalWidgetToolbarRowStyle}>
              <TerminalToolbar
                copy={copy.toolbar}
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
          )}
        </ClearBox>
        <ClearBox runaComponent="terminal-widget-surface-wrap" style={terminalWidgetSurfaceWrapStyle}>
          <TerminalSurface
            cursorBlink={cursorBlink}
            cursorStyle={cursorStyle}
            fontSize={fontSize}
            hostId={hostId}
            inputAriaLabel={copy.terminalInputAria}
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
            themeSignal={resolvedTheme}
            themeMode={themeMode}
          />
        </ClearBox>
      </ClearBox>
    </RunaDomScopeProvider>
  )
}
