import type * as React from 'react'
import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { Plus, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { resolveLocalizedCopy } from '@/features/i18n/model/localized-copy'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { resolveTerminalDisplayWidgetId } from '@/features/terminal/model/display-widget-id'
import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Button } from '@/shared/ui/primitives'
import {
  ClearBox,
  DockviewTabChrome,
  IconButton,
  TerminalStatusHeader,
  TerminalToolbar,
} from '@/shared/ui/components'
import {
  terminalDockviewActionGroupStyle,
  terminalDockviewIconButtonStyle,
  terminalDockviewTabCloseButtonStyle,
} from '@/widgets/terminal/terminal-dockview-actions.styles'
import { closeTerminalPanel, resolveTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import { terminalWidgetAiActionButtonStyle } from '@/widgets/terminal/terminal-widget.styles'
import { terminalWidgetCopy } from '@/widgets/terminal/terminal-widget-copy'
import { useTerminalDockviewHeaderControls } from '@/widgets/terminal/terminal-dockview-header-controls'

const terminalDockviewHeaderActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.4rem',
  minWidth: 0,
  flexWrap: 'nowrap',
}

function formatCompactTerminalPrimaryText(cwd: string, fallbackTitle: string) {
  const trimmedCwd = cwd.trim()

  if (trimmedCwd === '') {
    return fallbackTitle
  }

  if (trimmedCwd === '~') {
    return trimmedCwd
  }

  const normalizedSegments = trimmedCwd.split('/').filter(Boolean)
  const lastSegment = normalizedSegments[normalizedSegments.length - 1]

  if (!lastSegment) {
    return trimmedCwd
  }

  return trimmedCwd.startsWith('~/') ? `~/${lastSegment}` : lastSegment
}

export function TerminalDockviewTabWidget(props: IDockviewPanelHeaderProps) {
  const { locale } = useAppLocale()
  const copy = resolveLocalizedCopy(terminalWidgetCopy, locale)
  const terminalPanelParams = resolveTerminalPanelParams(props.api.id, props.params)
  const headerControls = useTerminalDockviewHeaderControls(props.api.id)
  const terminalSession = useTerminalSession({
    runtimeWidgetId: terminalPanelParams.widgetId,
    title: terminalPanelParams.title,
  })
  const [isActiveTab, setIsActiveTab] = useState(props.api.group.activePanel?.id === props.api.id)
  const [panelCount, setPanelCount] = useState(props.api.group.panels.length)
  const isSingleTab = panelCount === 1

  useEffect(() => {
    const syncActiveTab = () => {
      setIsActiveTab(props.api.group.activePanel?.id === props.api.id)
      setPanelCount(props.api.group.panels.length)
    }

    syncActiveTab()

    const activePanelChangeDisposable = props.api.group.api.onDidActivePanelChange(syncActiveTab)
    const groupChangeDisposable = props.api.onDidGroupChange(syncActiveTab)

    return () => {
      activePanelChangeDisposable.dispose()
      groupChangeDisposable.dispose()
    }
  }, [props.api])

  const handleClosePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleCloseClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    await closeTerminalPanel(props.api, terminalPanelParams)
  }

  const renderCloseButton =
    panelCount > 1 ? (
      <IconButton
        aria-label={copy.closeTerminalTabAria(terminalPanelParams.title)}
        onClick={handleCloseClick}
        onPointerDown={handleClosePointerDown}
        runaComponent="terminal-tab-close"
        size="sm"
        style={terminalDockviewTabCloseButtonStyle}
      >
        <X size={14} strokeWidth={1.8} />
      </IconButton>
    ) : null

  return (
    <RunaDomScopeProvider component="terminal-dockview-tab-widget" widget={props.api.id}>
      <DockviewTabChrome active={isActiveTab} single={isSingleTab}>
        {isSingleTab && headerControls ? (
          <TerminalStatusHeader
            compact
            compactMetaMode="full"
            actionSlot={
              <ClearBox
                runaComponent="terminal-dockview-header-actions"
                style={terminalDockviewHeaderActionsStyle}
              >
                <ClearBox
                  runaComponent="terminal-dockview-session-actions"
                  style={terminalDockviewActionGroupStyle}
                >
                  <Button
                    aria-label={headerControls.createSession.ariaLabel}
                    disabled={headerControls.createSession.disabled}
                    onClick={headerControls.createSession.onClick}
                    runaComponent="terminal-dockview-create-session"
                    style={{
                      ...terminalWidgetAiActionButtonStyle,
                      ...(headerControls.createSession.disabled
                        ? {
                            cursor: 'default',
                            opacity: 0.58,
                          }
                        : null),
                    }}
                    title={headerControls.createSession.title}
                  >
                    <Plus size={13} strokeWidth={1.8} />
                    {headerControls.createSession.label}
                  </Button>
                </ClearBox>
                <TerminalToolbar
                  copy={copy.toolbar}
                  isSearchOpen={headerControls.toolbar.isSearchOpen}
                  onClear={headerControls.toolbar.onClear}
                  onCloseSearch={headerControls.toolbar.onCloseSearch}
                  onCopy={headerControls.toolbar.onCopy}
                  onJumpToLatest={headerControls.toolbar.onJumpToLatest}
                  onPaste={headerControls.toolbar.onPaste}
                  onSearchNext={headerControls.toolbar.onSearchNext}
                  onSearchPrevious={headerControls.toolbar.onSearchPrevious}
                  onSearchQueryChange={headerControls.toolbar.onSearchQueryChange}
                  onToggleSearch={headerControls.toolbar.onToggleSearch}
                  searchQuery={headerControls.toolbar.searchQuery}
                  searchResult={headerControls.toolbar.searchResult}
                  showRendererBadge={false}
                />
                {headerControls.recover ? (
                  <Button
                    aria-label={headerControls.recover.ariaLabel}
                    disabled={headerControls.recover.disabled}
                    onClick={headerControls.recover.onClick}
                    runaComponent="terminal-dockview-recover"
                    style={terminalWidgetAiActionButtonStyle}
                    title={headerControls.recover.title}
                  >
                    {headerControls.recover.label}
                  </Button>
                ) : null}
                <ClearBox
                  runaComponent="terminal-dockview-header-icon-actions"
                  style={terminalDockviewActionGroupStyle}
                >
                  <IconButton
                    aria-label={headerControls.explain.ariaLabel}
                    disabled={headerControls.explain.disabled}
                    onClick={headerControls.explain.onClick}
                    runaComponent="terminal-dockview-explain"
                    size="sm"
                    style={terminalDockviewIconButtonStyle}
                    title={headerControls.explain.title}
                  >
                    <Sparkles size={13} strokeWidth={1.8} />
                  </IconButton>
                  <IconButton
                    aria-label={headerControls.interrupt.ariaLabel}
                    disabled={headerControls.interrupt.disabled}
                    onClick={headerControls.interrupt.onClick}
                    runaComponent="terminal-dockview-interrupt"
                    size="sm"
                    style={terminalDockviewIconButtonStyle}
                    title={headerControls.interrupt.title}
                  >
                    <Square size={12} strokeWidth={2} />
                  </IconButton>
                  <IconButton
                    aria-label={headerControls.restart.ariaLabel}
                    disabled={headerControls.restart.disabled}
                    onClick={headerControls.restart.onClick}
                    runaComponent="terminal-dockview-restart"
                    size="sm"
                    style={terminalDockviewIconButtonStyle}
                    title={headerControls.restart.title}
                  >
                    <RotateCcw size={12} strokeWidth={1.8} />
                  </IconButton>
                </ClearBox>
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
            primaryText={resolveTerminalDisplayWidgetId(terminalPanelParams.widgetId)}
            sessionState={terminalSession.sessionState}
            shellOptions={terminalSession.shellOptions}
            shellLabel={terminalSession.shellLabel}
            title={terminalPanelParams.title}
          />
        ) : (
          <TerminalStatusHeader
            actionSlot={renderCloseButton}
            activeShell={terminalSession.runtimeState?.shell ?? null}
            compact
            compactMetaMode="minimal"
            connectionKind={terminalSession.connectionKind}
            cwd={terminalSession.cwd}
            isShellMenuDisabled={terminalSession.connectionKind !== 'local'}
            isShellMenuLoading={terminalSession.isLoadingShells}
            isShellSwitching={terminalSession.isSwitchingShell}
            onOpenShellMenu={terminalSession.loadShellOptions}
            onSelectShell={terminalSession.switchShell}
            primaryText={formatCompactTerminalPrimaryText(terminalSession.cwd, terminalPanelParams.title)}
            sessionState={terminalSession.sessionState}
            shellOptions={terminalSession.shellOptions}
            shellLabel={terminalSession.shellLabel}
            showMeta={isActiveTab}
            title={terminalPanelParams.title}
          />
        )}
      </DockviewTabChrome>
    </RunaDomScopeProvider>
  )
}
