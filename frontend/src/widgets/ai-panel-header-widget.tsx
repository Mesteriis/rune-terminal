import { Settings2 } from 'lucide-react'

import { IconButton } from '../shared/ui/components'
import { Box, Surface, Text } from '../shared/ui/primitives'

import {
  aiHeaderActionStyle,
  aiShellHeaderStyle,
  aiShellTitleSurfaceStyle,
  aiShellTitleTextStyle,
} from './ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  title: string
}

export function AiPanelHeaderWidget({ title }: AiPanelHeaderWidgetProps) {
  return (
    <Box style={aiShellHeaderStyle}>
      <Surface style={aiShellTitleSurfaceStyle}>
        <Text style={aiShellTitleTextStyle}>{title}</Text>
      </Surface>
      <IconButton aria-label="AI panel settings" style={aiHeaderActionStyle}>
        <Settings2 size={18} strokeWidth={1.8} />
      </IconButton>
    </Box>
  )
}
