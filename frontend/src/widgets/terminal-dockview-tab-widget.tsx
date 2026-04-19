import type * as React from 'react'
import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { IconButton, TerminalStatusHeader } from '../shared/ui/components'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  resolveTerminalPanelParams,
} from './terminal-panel'

const addButtonStyle = {
  width: '28px',
  minWidth: '28px',
  height: '28px',
  minHeight: '28px',
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
}

export function TerminalDockviewTabWidget(props: IDockviewPanelHeaderProps) {
  const terminalPanelParams = resolveTerminalPanelParams(props.api.id, props.params)
  const [isActiveTab, setIsActiveTab] = useState(props.api.group.activePanel?.id === props.api.id)

  useEffect(() => {
    const syncActiveTab = () => {
      setIsActiveTab(props.api.group.activePanel?.id === props.api.id)
    }

    syncActiveTab()

    const activePanelChangeDisposable = props.api.group.api.onDidActivePanelChange(syncActiveTab)
    const groupChangeDisposable = props.api.onDidGroupChange(syncActiveTab)

    return () => {
      activePanelChangeDisposable.dispose()
      groupChangeDisposable.dispose()
    }
  }, [props.api])

  const handleAddTerminalTab = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const nextPanelId = createNextTerminalPanelId(props.containerApi, terminalPanelParams.preset)
    const nextPanelParams = createTerminalPanelParams(terminalPanelParams.preset)
    const suffixMatch = nextPanelId.match(/-(\d+)$/)

    props.containerApi.addPanel({
      id: nextPanelId,
      title: suffixMatch ? `${nextPanelParams.title} ${suffixMatch[1]}` : nextPanelParams.title,
      component: 'default',
      tabComponent: 'terminal-tab',
      params: nextPanelParams,
      position: {
        direction: 'within',
        referencePanel: props.api.id,
      },
    })
  }

  const handleAddPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <RunaDomScopeProvider component="terminal-dockview-tab-widget" widget={props.api.id}>
      <TerminalStatusHeader
        actionSlot={isActiveTab ? (
          <IconButton
            aria-label={`Add terminal tab for ${terminalPanelParams.title}`}
            onClick={handleAddTerminalTab}
            onPointerDown={handleAddPointerDown}
            runaComponent="terminal-tab-add"
            size="sm"
            style={addButtonStyle}
          >
            <Plus size={14} strokeWidth={1.8} />
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
    </RunaDomScopeProvider>
  )
}
