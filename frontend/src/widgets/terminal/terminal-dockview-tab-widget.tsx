import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { DockviewTabChrome, IconButton, TerminalStatusHeader } from '@/shared/ui/components'
import { terminalDockviewTabCloseButtonStyle } from '@/widgets/terminal/terminal-dockview-actions.styles'
import { closeTerminalPanel, resolveTerminalPanelParams } from '@/widgets/terminal/terminal-panel'

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
  const terminalPanelParams = resolveTerminalPanelParams(props.api.id, props.params)
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

  return (
    <RunaDomScopeProvider component="terminal-dockview-tab-widget" widget={props.api.id}>
      <DockviewTabChrome active={isActiveTab} single={isSingleTab}>
        <TerminalStatusHeader
          actionSlot={
            panelCount > 1 ? (
              <IconButton
                aria-label={`Close terminal tab for ${terminalPanelParams.title}`}
                onClick={handleCloseClick}
                onPointerDown={handleClosePointerDown}
                runaComponent="terminal-tab-close"
                size="sm"
                style={terminalDockviewTabCloseButtonStyle}
              >
                <X size={14} strokeWidth={1.8} />
              </IconButton>
            ) : null
          }
          compact
          compactMetaMode="minimal"
          connectionKind={terminalSession.connectionKind}
          cwd={terminalSession.cwd}
          primaryText={formatCompactTerminalPrimaryText(terminalSession.cwd, terminalPanelParams.title)}
          sessionState={terminalSession.sessionState}
          shellLabel={terminalSession.shellLabel}
          showMeta={isActiveTab}
          title={terminalPanelParams.title}
        />
      </DockviewTabChrome>
    </RunaDomScopeProvider>
  )
}
