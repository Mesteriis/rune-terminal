import type * as React from 'react'
import type { IDockviewPanelHeaderProps } from 'dockview-react'
import { Plus } from 'lucide-react'

import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { IconButton, TerminalStatusHeader } from '../shared/ui/components'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  resolveTerminalPanelParams,
} from './terminal-panel'

const addButtonStyle = {
  width: '20px',
  minWidth: '20px',
  height: '20px',
  minHeight: '20px',
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-xs)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
}

export function TerminalDockviewTabWidget(props: IDockviewPanelHeaderProps) {
  const terminalPanelParams = resolveTerminalPanelParams(props.api.id, props.params)

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
        actionSlot={(
          <IconButton
            aria-label={`Add terminal tab for ${terminalPanelParams.title}`}
            onClick={handleAddTerminalTab}
            onPointerDown={handleAddPointerDown}
            runaComponent="terminal-tab-add"
            size="sm"
            style={addButtonStyle}
          >
            <Plus size={12} strokeWidth={1.8} />
          </IconButton>
        )}
        compact
        connectionKind={terminalPanelParams.connectionKind}
        cwd={terminalPanelParams.cwd}
        sessionState={terminalPanelParams.sessionState}
        shellLabel={terminalPanelParams.shellLabel}
        title={terminalPanelParams.title}
      />
    </RunaDomScopeProvider>
  )
}
