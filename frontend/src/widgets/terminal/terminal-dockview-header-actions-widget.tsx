import type * as React from 'react'
import type { IDockviewHeaderActionsProps } from 'dockview-react'
import { Plus, X } from 'lucide-react'

import { createTerminalTab } from '@/features/terminal/api/client'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton } from '@/shared/ui/components'
import { Box } from '@/shared/ui/primitives'
import {
  closeTerminalPanel,
  createNextTerminalPanelId,
  createTerminalPanelParams,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from '@/widgets/terminal/terminal-panel'
import {
  resolveDockviewHeaderActionsWrapStyle,
  terminalDockviewActionGroupStyle,
  terminalDockviewIconButtonStyle,
} from '@/widgets/terminal/terminal-dockview-actions.styles'

export function TerminalDockviewHeaderActionsWidget(props: IDockviewHeaderActionsProps) {
  if (!props.activePanel) {
    return null
  }

  const isTerminal = isTerminalPanel(props.activePanel.id, props.activePanel.params)
  const terminalPanelParams = isTerminal
    ? resolveTerminalPanelParams(props.activePanel.id, props.activePanel.params)
    : null
  const headerActionsWrapStyle = resolveDockviewHeaderActionsWrapStyle(Boolean(terminalPanelParams))

  const handleAddTerminalTab = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!terminalPanelParams) {
      return
    }

    const nextPanelId = createNextTerminalPanelId(props.containerApi, terminalPanelParams.preset)
    const nextPanelParams = createTerminalPanelParams(terminalPanelParams.preset, nextPanelId)
    const suffixMatch = nextPanelId.match(/-(\d+)$/)

    try {
      const runtimeTerminal = await createTerminalTab(nextPanelParams.title)

      props.containerApi.addPanel({
        id: nextPanelId,
        title: suffixMatch ? `${nextPanelParams.title} ${suffixMatch[1]}` : nextPanelParams.title,
        component: 'default',
        tabComponent: 'terminal-tab',
        params: createTerminalPanelParams(
          terminalPanelParams.preset,
          runtimeTerminal.widget_id,
          runtimeTerminal.tab_id,
        ),
        position: {
          direction: 'within',
          referencePanel: props.activePanel!.id,
        },
      })
    } catch (error) {
      console.error('Unable to add terminal tab', error)
    }
  }

  const handleAddPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const handleClosePanel = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!props.activePanel || !terminalPanelParams) {
      return
    }

    await closeTerminalPanel(props.activePanel.api, terminalPanelParams)
  }

  const handleClosePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <RunaDomScopeProvider component="terminal-dockview-header-actions-widget" widget={props.activePanel.id}>
      <Box runaComponent="terminal-dockview-header-actions-wrap" style={headerActionsWrapStyle}>
        <Box runaComponent="terminal-dockview-header-actions-group" style={terminalDockviewActionGroupStyle}>
          {terminalPanelParams ? (
            <IconButton
              aria-label={`Add terminal tab for ${terminalPanelParams.title}`}
              onClick={handleAddTerminalTab}
              onPointerDown={handleAddPointerDown}
              runaComponent="terminal-group-add"
              size="sm"
              style={terminalDockviewIconButtonStyle}
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
            style={terminalDockviewIconButtonStyle}
          >
            <X size={14} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
