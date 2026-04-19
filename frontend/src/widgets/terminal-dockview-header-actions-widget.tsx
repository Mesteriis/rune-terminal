import type * as React from 'react'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import { Plus } from 'lucide-react'

import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { IconButton } from '../shared/ui/components'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from './terminal-panel'

const addButtonStyle = {
  width: '28px',
  minWidth: '28px',
  height: '28px',
  minHeight: '28px',
  marginTop: '8px',
  marginRight: '8px',
  padding: 0,
  border: '1px solid var(--runa-terminal-surface-border, var(--color-border-subtle))',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  flex: '0 0 auto',
}

export function TerminalDockviewHeaderActionsWidget(props: IDockviewHeaderActionsProps) {
  if (!props.activePanel || !isTerminalPanel(props.activePanel.id, props.activePanel.params)) {
    return null
  }

  const terminalPanelParams = resolveTerminalPanelParams(props.activePanel.id, props.activePanel.params)

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
        referencePanel: props.activePanel!.id,
      },
    })
  }

  const handleAddPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <RunaDomScopeProvider component="terminal-dockview-header-actions-widget" widget={props.activePanel.id}>
      <IconButton
        aria-label={`Add terminal tab for ${terminalPanelParams.title}`}
        onClick={handleAddTerminalTab}
        onPointerDown={handleAddPointerDown}
        runaComponent="terminal-group-add"
        size="sm"
        style={addButtonStyle}
      >
        <Plus size={14} strokeWidth={1.8} />
      </IconButton>
    </RunaDomScopeProvider>
  )
}
