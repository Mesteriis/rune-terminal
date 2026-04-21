import runaAvatar from '@assets/img/logo.png'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Avatar } from '@/shared/ui/components'
import { Box, Button, Surface, Text } from '@/shared/ui/primitives'

import {
  aiHeaderModeButtonActiveStyle,
  aiHeaderModeButtonStyle,
  aiHeaderModeGroupStyle,
  aiShellHeaderStyle,
  aiShellHeaderLogoSlotStyle,
  aiShellHeaderTitleLaneStyle,
  aiShellTitleClusterStyle,
  aiShellTitleTextStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  title: string
}

const CHAT_MODES: ChatMode[] = ['chat', 'dev', 'debug']

export function AiPanelHeaderWidget({ mode, onModeChange, title }: AiPanelHeaderWidgetProps) {
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
        <Box runaComponent="ai-panel-header-mode-group" style={aiHeaderModeGroupStyle}>
          {CHAT_MODES.map((chatMode) => (
            <Button
              aria-pressed={mode === chatMode}
              key={chatMode}
              onClick={() => onModeChange(chatMode)}
              runaComponent={`ai-panel-header-mode-${chatMode}`}
              style={{
                ...aiHeaderModeButtonStyle,
                ...(mode === chatMode ? aiHeaderModeButtonActiveStyle : null),
              }}
            >
              {chatMode}
            </Button>
          ))}
        </Box>
      </Surface>
    </RunaDomScopeProvider>
  )
}
