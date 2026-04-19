import { List, SendHorizontal } from 'lucide-react'

import { IconButton } from '../shared/ui/components'
import { Badge, Box, Surface, Text, TextArea } from '../shared/ui/primitives'

import {
  aiComposerActionRailStyle,
  aiComposerActionStyle,
  aiComposerSurfaceStyle,
  aiComposerTextAreaStyle,
  aiToolbarChipStyle,
  aiToolbarLabelStyle,
  aiToolbarStyle,
} from './ai-panel-widget.styles'

export type AiComposerWidgetProps = {
  toolbarLabel: string
  activeTool: string
  placeholder: string
}

export function AiComposerWidget({
  activeTool,
  placeholder,
  toolbarLabel,
}: AiComposerWidgetProps) {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
      <Surface style={aiToolbarStyle}>
        <Text style={aiToolbarLabelStyle}>{toolbarLabel}</Text>
        <Badge style={aiToolbarChipStyle}>{activeTool}</Badge>
      </Surface>
      <Surface style={aiComposerSurfaceStyle}>
        <TextArea placeholder={placeholder} style={aiComposerTextAreaStyle} />
        <Box style={aiComposerActionRailStyle}>
          <IconButton aria-label="Composer options" style={aiComposerActionStyle}>
            <List size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton aria-label="Send prompt" style={aiComposerActionStyle}>
            <SendHorizontal size={18} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Surface>
    </Box>
  )
}
