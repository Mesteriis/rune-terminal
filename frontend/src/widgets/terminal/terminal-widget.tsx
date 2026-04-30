import { RotateCcw, Sparkles, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useAppTheme } from '@/features/theme/model/theme-provider'
import { fetchTerminalDiagnostics } from '@/features/terminal/api/client'
import { useTerminalPreferences } from '@/features/terminal/model/use-terminal-preferences'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { openAiSidebar } from '@/shared/model/app'
import { queueAiPromptHandoff } from '@/shared/model/ai-handoff'
import { resolveLocalizedCopy } from '@/features/i18n/model/localized-copy'
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
  terminalWidgetCommandActionsStyle,
  terminalWidgetRootStyle,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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
  const isRestartDisabled =
    terminalSession.isLoading || terminalSession.isInterrupting || terminalSession.isRestarting
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
  const isExplainAndFixDisabled = !canExplainAndFix || isExplainAndFixPending
  useEffect(() => {
    if (!preferDockviewHeaderChrome) {
      clearTerminalDockviewHeaderControls(hostId)
      return
    }

    setTerminalDockviewHeaderControls(hostId, {
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
    isRecoverDisabled,
    isRestartDisabled,
    isSearchOpen,
    preferDockviewHeaderChrome,
    recoverButtonLabel,
    searchQuery,
    searchResult,
    terminalSession.connectionKind,
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
            <ClearBox runaComponent="terminal-widget-toolbar-row" style={terminalWidgetToolbarRowStyle}>
              <TerminalStatusHeader
                compact
                actionSlot={
                  <ClearBox
                    runaComponent="terminal-widget-command-actions"
                    style={terminalWidgetCommandActionsStyle}
                  >
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
                      searchQuery={searchQuery}
                      searchResult={searchResult}
                      showRendererBadge={false}
                    />
                    {canRecoverTerminal ? (
                      <Button
                        aria-label={copy.recoverSessionAria(title)}
                        disabled={isRecoverDisabled}
                        onClick={() => {
                          void terminalSession.recoverSession()
                        }}
                        runaComponent="terminal-widget-recover-session"
                        style={terminalWidgetAiActionButtonStyle}
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
                    <Button
                      aria-label={copy.explainAndFixAria(title)}
                      disabled={isExplainAndFixDisabled}
                      onClick={() => {
                        void handleExplainAndFix()
                      }}
                      runaComponent="terminal-widget-explain-fix"
                      style={terminalWidgetAiActionButtonStyle}
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
                      style={terminalWidgetAiActionButtonStyle}
                      title={terminalSession.isInterrupting ? copy.interruptingTitle : copy.interruptTitle}
                    >
                      <Square size={12} strokeWidth={2} />
                    </IconButton>
                    <IconButton
                      aria-label={copy.restartAria(title)}
                      disabled={isRestartDisabled}
                      onClick={handleRestart}
                      runaComponent="terminal-widget-restart"
                      size="sm"
                      style={terminalWidgetAiActionButtonStyle}
                      title={terminalSession.isRestarting ? copy.restartingTitle : copy.restartTitle}
                    >
                      <RotateCcw size={14} strokeWidth={1.8} />
                    </IconButton>
                  </ClearBox>
                }
                activeShell={terminalSession.runtimeState?.shell ?? null}
                connectionKind={terminalSession.connectionKind}
                compactMetaMode="full"
                cwd={terminalSession.cwd}
                isShellMenuDisabled={terminalSession.connectionKind !== 'local'}
                isShellMenuLoading={terminalSession.isLoadingShells}
                isShellSwitching={terminalSession.isSwitchingShell}
                onOpenShellMenu={terminalSession.loadShellOptions}
                onSelectShell={terminalSession.switchShell}
                primaryText={terminalSession.cwd}
                sessionState={terminalSession.sessionState}
                shellOptions={terminalSession.shellOptions}
                shellLabel={terminalSession.shellLabel}
                title={title}
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
            lineHeight={lineHeight}
            onInput={terminalSession.canSendInput ? terminalSession.sendInputChunk : undefined}
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
