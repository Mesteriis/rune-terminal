import type { IDockviewPanelProps } from 'dockview-react'

import { Box, Text } from '../shared/ui/primitives'
import { ModalHostWidget } from './modal-host-widget'
import { PanelModalActionsWidget } from './panel-modal-actions-widget'
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

export function DockviewPanelWidget(props: IDockviewPanelProps) {
  return (
    <Box data-runa-modal-anchor={props.api.id} style={panelContentStyle}>
      <Text>{`PANEL: ${props.api.id}`}</Text>
      <PanelModalActionsWidget hostId={props.api.id} panelTitle={props.api.id} />
      <ModalHostWidget hostId={props.api.id} scope="widget" />
      <WidgetBusyOverlayWidget hostId={props.api.id} />
    </Box>
  )
}
