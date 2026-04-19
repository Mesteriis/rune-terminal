import { useUnit } from 'effector-react'
import type { IDockviewPanelProps } from 'dockview-react'
import { useEffect, useRef } from 'react'

import { CommanderDemoLayout } from '../layouts'
import { $activeWidgetHostId, setActiveWidgetHostId } from '../shared/model/widget-focus'
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

function isCommanderDemoPanel(panelId: string) {
  return panelId === 'tool'
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
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [activeWidgetHostId, onSetActiveWidgetHostId] = useUnit([
    $activeWidgetHostId,
    setActiveWidgetHostId,
  ])
  const terminalModel = isTerminalPanel(props.api.id) ? getTerminalModel(props.api.id) : null
  const isCommanderPanel = isCommanderDemoPanel(props.api.id)
  const isActiveWidget = activeWidgetHostId === props.api.id

  useEffect(() => {
    const groupElement = rootRef.current?.closest('.dv-groupview')

    if (!(groupElement instanceof HTMLElement)) {
      return
    }

    if (activeWidgetHostId === null) {
      delete groupElement.dataset.runaWidgetFocusState
      return
    }

    groupElement.dataset.runaWidgetFocusState = isActiveWidget ? 'active' : 'inactive'
  }, [activeWidgetHostId, isActiveWidget])

  return (
    <Box
      data-runa-modal-anchor={props.api.id}
      data-runa-widget-tone-root=""
      onPointerDownCapture={() => onSetActiveWidgetHostId(props.api.id)}
      ref={rootRef}
      style={panelContentStyle}
    >
      {terminalModel ? (
        <TerminalWidget hostId={props.api.id} {...terminalModel}>
          <PanelModalActionsWidget hostId={props.api.id} panelTitle={terminalModel.title} />
        </TerminalWidget>
      ) : isCommanderPanel ? (
        <CommanderDemoLayout />
      ) : (
        <>
          <Text>{`PANEL: ${props.api.id}`}</Text>
          <PanelModalActionsWidget hostId={props.api.id} panelTitle={props.api.id} />
        </>
      )}
      {isCommanderPanel ? null : <ModalHostWidget hostId={props.api.id} scope="widget" />}
      {isCommanderPanel ? null : <WidgetBusyOverlayWidget hostId={props.api.id} />}
    </Box>
  )
}
