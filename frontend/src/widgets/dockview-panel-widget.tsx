import type { IDockviewPanelProps } from 'dockview-react'

import { Box, Text } from '../shared/ui/primitives'

export function DockviewPanelWidget(props: IDockviewPanelProps) {
  return (
    <Box style={{ width: '100%', height: '100%' }}>
      <Text>{`PANEL: ${props.api.id}`}</Text>
    </Box>
  )
}
