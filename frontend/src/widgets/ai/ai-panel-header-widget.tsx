import { Settings2 } from 'lucide-react'

import runaAvatar from '@assets/img/logo.png'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Avatar, IconButton } from '@/shared/ui/components'
import { Box, Surface, Text } from '@/shared/ui/primitives'

import {
  aiHeaderActionStyle,
  aiShellHeaderStyle,
  aiShellHeaderLogoSlotStyle,
  aiShellHeaderTitleLaneStyle,
  aiShellTitleClusterStyle,
  aiShellTitleTextStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  title: string
}

export function AiPanelHeaderWidget({ title }: AiPanelHeaderWidgetProps) {
  return (
    <RunaDomScopeProvider component="ai-panel-header-widget">
      <Surface data-runa-ai-shell-header="" runaComponent="ai-panel-header-root" style={aiShellHeaderStyle}>
      <Box runaComponent="ai-panel-header-title-lane" style={aiShellHeaderTitleLaneStyle}>
        <Box
          aria-hidden="true"
          data-runa-ai-logo-slot=""
          runaComponent="ai-panel-header-logo-slot"
          style={aiShellHeaderLogoSlotStyle}
        >
          <Avatar label="Runa avatar" runaComponent="ai-panel-header-avatar" size={32} src={runaAvatar} />
        </Box>
        <Box runaComponent="ai-panel-header-title-cluster" style={aiShellTitleClusterStyle}>
          <Text runaComponent="ai-panel-header-title" style={aiShellTitleTextStyle}>
            {title} Assistant
          </Text>
        </Box>
      </Box>
      <IconButton aria-label="AI panel settings" runaComponent="ai-panel-header-settings" style={aiHeaderActionStyle}>
        <Settings2 size={18} strokeWidth={1.8} />
      </IconButton>
      </Surface>
    </RunaDomScopeProvider>
  )
}
