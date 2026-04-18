import type { IDockviewPanelProps } from 'dockview-react'

import { Box, Text } from '../shared/ui/primitives'
import { ModalHostWidget } from './modal-host-widget'
import { PanelModalActionsWidget } from './panel-modal-actions-widget'
import { TerminalWidget } from './terminal-widget'
import { WidgetBusyOverlayWidget } from './widget-busy-overlay-widget'

const panelContentStyle = {
  width: '100%',
  height: '100%',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  padding: 'var(--padding-widget)',
  overflow: 'hidden' as const,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

function isTerminalPanel(panelId: string) {
  return panelId.startsWith('terminal')
}

function getTerminalModel(panelId: string) {
  if (panelId === 'terminal-header') {
    return {
      title: 'Main terminal',
      cwd: '~/projects/runa-terminal',
      shellLabel: 'zsh',
      connectionKind: 'local' as const,
      sessionState: 'running' as const,
      introLines: [
        'last login: Sat Apr 19 10:32 on ttys004',
        'workspace restored from frontend renderer mock',
      ],
    }
  }

  return {
    title: 'Workspace shell',
    cwd: '~/projects/runa-terminal/frontend',
    shellLabel: 'zsh',
    connectionKind: 'local' as const,
    sessionState: 'idle' as const,
    introLines: [
      'renderer preview: xterm surface is mounted locally',
      'backend input/stream wiring will attach in the next slice',
    ],
  }
}

export function DockviewPanelWidget(props: IDockviewPanelProps) {
  const terminalModel = isTerminalPanel(props.api.id) ? getTerminalModel(props.api.id) : null

  return (
    <Box data-runa-modal-anchor={props.api.id} style={panelContentStyle}>
      {terminalModel ? (
        <TerminalWidget hostId={props.api.id} {...terminalModel}>
          <PanelModalActionsWidget hostId={props.api.id} panelTitle={terminalModel.title} />
        </TerminalWidget>
      ) : (
        <>
          <Text>{`PANEL: ${props.api.id}`}</Text>
          <PanelModalActionsWidget hostId={props.api.id} panelTitle={props.api.id} />
        </>
      )}
      <ModalHostWidget hostId={props.api.id} scope="widget" />
      <WidgetBusyOverlayWidget hostId={props.api.id} />
    </Box>
  )
}
