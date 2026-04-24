import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useTerminalSession } from '@/features/terminal/model/use-terminal-session'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { DockviewTabChrome, IconButton, TerminalStatusHeader } from '@/shared/ui/components'
import { closeTerminalPanel, resolveTerminalPanelParams } from '@/widgets/terminal/terminal-panel'

const closeButtonStyle = {
  width: '28px',
  minWidth: '28px',
  height: '28px',
  minHeight: '28px',
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-canvas-elevated)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
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
                style={closeButtonStyle}
              >
                <X size={14} strokeWidth={1.8} />
              </IconButton>
            ) : null
          }
          compact
          connectionKind={terminalSession.connectionKind}
          cwd={terminalSession.cwd}
          primaryText={terminalSession.cwd || terminalPanelParams.title}
          sessionState={terminalSession.sessionState}
          shellLabel={terminalSession.shellLabel}
          showMeta={isActiveTab}
          title={terminalPanelParams.title}
        />
      </DockviewTabChrome>
    </RunaDomScopeProvider>
  )
}
