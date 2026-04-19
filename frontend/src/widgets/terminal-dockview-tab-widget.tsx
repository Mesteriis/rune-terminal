import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { IconButton, TerminalStatusHeader } from '../shared/ui/components'
import { Box } from '../shared/ui/primitives'
import { resolveTerminalPanelParams } from './terminal-panel'

const tabRootStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'stretch',
  minWidth: 0,
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const activeTabChromeStyle = {
  flex: 1,
  minWidth: 0,
  height: '100%',
  display: 'flex',
  alignItems: 'stretch',
  padding: '0 var(--space-xs)',
  border: '1px solid rgba(130, 188, 170, 0.18)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(130, 188, 170, 0.08)',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const inactiveTabChromeStyle = {
  ...activeTabChromeStyle,
  border: 'none',
  background: 'transparent',
}

const separatorStyle = {
  flex: '0 0 1px',
  width: '1px',
  alignSelf: 'stretch',
  margin: '8px 0',
  background: 'var(--runa-terminal-surface-border, var(--color-border-subtle))',
}

const closeButtonStyle = {
  width: '28px',
  minWidth: '28px',
  height: '28px',
  minHeight: '28px',
  padding: 0,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
  color: 'var(--runa-terminal-text-muted, var(--color-text-muted))',
}

export function TerminalDockviewTabWidget(props: IDockviewPanelHeaderProps) {
  const terminalPanelParams = resolveTerminalPanelParams(props.api.id, props.params)
  const [isActiveTab, setIsActiveTab] = useState(props.api.group.activePanel?.id === props.api.id)
  const [panelCount, setPanelCount] = useState(props.api.group.panels.length)
  const [isLastTab, setIsLastTab] = useState(
    props.api.group.panels[props.api.group.panels.length - 1]?.id === props.api.id,
  )

  useEffect(() => {
    const syncActiveTab = () => {
      setIsActiveTab(props.api.group.activePanel?.id === props.api.id)
      setPanelCount(props.api.group.panels.length)
      setIsLastTab(props.api.group.panels[props.api.group.panels.length - 1]?.id === props.api.id)
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

  const handleCloseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    props.api.close()
  }

  return (
    <RunaDomScopeProvider component="terminal-dockview-tab-widget" widget={props.api.id}>
      <Box runaComponent="terminal-tab-root" style={tabRootStyle}>
        <Box
          runaComponent="terminal-tab-chrome"
          style={isActiveTab ? activeTabChromeStyle : inactiveTabChromeStyle}
        >
          <TerminalStatusHeader
            actionSlot={panelCount > 1 ? (
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
            ) : null}
            compact
            connectionKind={terminalPanelParams.connectionKind}
            cwd={terminalPanelParams.cwd}
            primaryText={terminalPanelParams.cwd}
            sessionState={terminalPanelParams.sessionState}
            shellLabel={terminalPanelParams.shellLabel}
            showMeta={isActiveTab}
            title={terminalPanelParams.title}
          />
        </Box>
        {panelCount > 1 && !isLastTab ? (
          <Box runaComponent="terminal-tab-separator" style={separatorStyle} />
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
