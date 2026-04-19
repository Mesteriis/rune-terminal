import { List, SendHorizontal } from 'lucide-react'

import { RunaDomScopeProvider } from '../shared/ui/dom-id'
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
    <RunaDomScopeProvider component="ai-composer-widget">
      <Box runaComponent="ai-composer-root" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
      <Surface runaComponent="ai-composer-toolbar" style={aiToolbarStyle}>
        <Text runaComponent="ai-composer-toolbar-label" style={aiToolbarLabelStyle}>{toolbarLabel}</Text>
        <Badge runaComponent="ai-composer-toolbar-chip" style={aiToolbarChipStyle}>{activeTool}</Badge>
      </Surface>
      <Surface runaComponent="ai-composer-surface" style={aiComposerSurfaceStyle}>
        <TextArea placeholder={placeholder} runaComponent="ai-composer-textarea" style={aiComposerTextAreaStyle} />
        <Box runaComponent="ai-composer-action-rail" style={aiComposerActionRailStyle}>
          <IconButton aria-label="Composer options" runaComponent="ai-composer-options" style={aiComposerActionStyle}>
            <List size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton aria-label="Send prompt" runaComponent="ai-composer-send" style={aiComposerActionStyle}>
            <SendHorizontal size={18} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Surface>
      </Box>
    </RunaDomScopeProvider>
  )
}
