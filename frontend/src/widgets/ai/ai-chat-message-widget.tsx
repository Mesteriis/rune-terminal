import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Surface, Text } from '@/shared/ui/primitives'

import type { ChatMessageView } from '@/features/agent/model/types'
import {
  aiChatMessageCardStyle,
  aiChatMessageContentStyle,
  aiChatMessageHeaderStyle,
  aiChatMessageRoleStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiChatMessageWidgetProps = {
  message: ChatMessageView
  index: number
}

export function AiChatMessageWidget({ message, index }: AiChatMessageWidgetProps) {
  const label = message.role === 'user' ? `User ${index + 1}` : `Assistant ${index + 1}`

  return (
    <RunaDomScopeProvider component={`ai-chat-message-${message.id}`}>
      <Surface runaComponent={`ai-chat-message-${message.id}-surface`} style={aiChatMessageCardStyle}>
        <Box runaComponent={`ai-chat-message-${message.id}-header`} style={aiChatMessageHeaderStyle}>
          <Text runaComponent={`ai-chat-message-${message.id}-role`} style={aiChatMessageRoleStyle}>
            {label}
          </Text>
        </Box>
        <Text runaComponent={`ai-chat-message-${message.id}-content`} style={aiChatMessageContentStyle}>
          {message.content}
        </Text>
      </Surface>
    </RunaDomScopeProvider>
  )
}
