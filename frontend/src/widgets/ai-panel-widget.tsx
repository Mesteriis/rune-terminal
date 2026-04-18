import type { IDockviewPanelProps } from 'dockview-react'

import { Box, Text } from '../shared/ui/primitives'

export function AiPanelWidget(props: IDockviewPanelProps) {
  return (
    <Box style={{ width: '100%', height: '100%' }}>
      <Text>{`AI PANEL: ${props.api.id}`}</Text>
    </Box>
  )
}
