import { Settings2 } from 'lucide-react'

import runaAvatar from '../../assets/img/logo.png'
import { Avatar, IconButton } from '../shared/ui/components'
import { Box, Surface, Text } from '../shared/ui/primitives'

import {
  aiHeaderActionStyle,
  aiShellHeaderStyle,
  aiShellHeaderLogoSlotStyle,
  aiShellHeaderTitleLaneStyle,
  aiShellTitleClusterStyle,
  aiShellTitleTextStyle,
} from './ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  title: string
}

export function AiPanelHeaderWidget({ title }: AiPanelHeaderWidgetProps) {
  return (
    <Surface data-runa-ai-shell-header="" style={aiShellHeaderStyle}>
      <Box style={aiShellHeaderTitleLaneStyle}>
        <Box aria-hidden="true" data-runa-ai-logo-slot="" style={aiShellHeaderLogoSlotStyle}>
          <Avatar label="Runa avatar" size={32} src={runaAvatar} />
        </Box>
        <Box style={aiShellTitleClusterStyle}>
          <Text style={aiShellTitleTextStyle}>{title} Assistant</Text>
        </Box>
      </Box>
      <IconButton aria-label="AI panel settings" style={aiHeaderActionStyle}>
        <Settings2 size={18} strokeWidth={1.8} />
      </IconButton>
    </Surface>
  )
}
