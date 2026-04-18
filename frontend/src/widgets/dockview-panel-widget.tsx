import type { IDockviewPanelProps } from 'dockview-react'

import { Box, Text } from '../shared/ui/primitives'

const panelContentStyle = {
  width: '100%',
  height: '100%',
  padding: 'var(--padding-widget)',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

export function DockviewPanelWidget(props: IDockviewPanelProps) {
  return (
    <Box style={panelContentStyle}>
      <Text>{`PANEL: ${props.api.id}`}</Text>
    </Box>
  )
}
