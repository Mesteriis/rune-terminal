import { Settings2 } from 'lucide-react'

import { IconButton } from '../shared/ui/components'
import { Box, Surface, Text } from '../shared/ui/primitives'

import {
  aiHeaderActionStyle,
  aiShellHeaderStyle,
  aiShellHeaderTitleLaneStyle,
  aiShellTitleAccentStyle,
  aiShellTitleClusterStyle,
  aiShellTitleEyebrowStyle,
  aiShellTitleTextStyle,
} from './ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  title: string
}

export function AiPanelHeaderWidget({ title }: AiPanelHeaderWidgetProps) {
  return (
    <Surface style={aiShellHeaderStyle}>
      <Box style={aiShellHeaderTitleLaneStyle}>
        <Box aria-hidden="true" style={aiShellTitleAccentStyle} />
        <Box style={aiShellTitleClusterStyle}>
          <Text style={aiShellTitleEyebrowStyle}>Assistant</Text>
          <Text style={aiShellTitleTextStyle}>{title}</Text>
        </Box>
      </Box>
      <IconButton aria-label="AI panel settings" style={aiHeaderActionStyle}>
        <Settings2 size={18} strokeWidth={1.8} />
      </IconButton>
    </Surface>
  )
}
