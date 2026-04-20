import type * as React from 'react'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import { Plus, X } from 'lucide-react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton } from '@/shared/ui/components'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from '@/widgets/terminal/terminal-panel'

const actionsWrapStyle = {
  display: 'flex',
  height: 'calc(100% - (var(--padding-widget) / 2))',
  minHeight: 0,
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginTop: 'calc(var(--padding-widget) / 2)',
  padding: '0 8px 0 0',
  gap: 'var(--gap-xs)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const actionButtonStyle = {
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
}

export function TerminalDockviewHeaderActionsWidget(props: IDockviewHeaderActionsProps) {
  if (!props.activePanel) {
    return null
  }

  const isTerminal = isTerminalPanel(props.activePanel.id, props.activePanel.params)
  const terminalPanelParams = isTerminal
    ? resolveTerminalPanelParams(props.activePanel.id, props.activePanel.params)
    : null

  const handleAddTerminalTab = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!terminalPanelParams) {
      return
    }

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

  const handleClosePanel = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    props.activePanel?.api.close()
  }

  const handleClosePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <RunaDomScopeProvider component="terminal-dockview-header-actions-widget" widget={props.activePanel.id}>
      <div style={actionsWrapStyle}>
        {terminalPanelParams ? (
          <IconButton
            aria-label={`Add terminal tab for ${terminalPanelParams.title}`}
            onClick={handleAddTerminalTab}
            onPointerDown={handleAddPointerDown}
            runaComponent="terminal-group-add"
            size="sm"
            style={actionButtonStyle}
          >
            <Plus size={14} strokeWidth={1.8} />
          </IconButton>
        ) : null}
        <IconButton
          aria-label={`Close ${props.activePanel.title ?? props.activePanel.id}`}
          onClick={handleClosePanel}
          onPointerDown={handleClosePointerDown}
          runaComponent="dockview-panel-close"
          size="sm"
          style={actionButtonStyle}
        >
          <X size={14} strokeWidth={1.8} />
        </IconButton>
      </div>
    </RunaDomScopeProvider>
  )
}
