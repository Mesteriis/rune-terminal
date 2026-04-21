import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Surface, Text } from '@/shared/ui/primitives'

import type { ChatMessageView } from '@/features/agent/model/types'
import {
  aiChatMessageContentStyle,
  aiChatMessageBubbleStyle,
  aiChatMessageRowStyle,
  aiChatMessageAssistantBubbleStyle,
  aiChatMessageAssistantRowStyle,
  aiChatMessageUserBubbleStyle,
  aiChatMessageUserRowStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiChatMessageWidgetProps = {
  message: ChatMessageView
}

export function AiChatMessageWidget({ message }: AiChatMessageWidgetProps) {
  const isUser = message.role === 'user'

  return (
    <RunaDomScopeProvider component={`ai-chat-message-${message.id}`}>
      <Box
        runaComponent={`ai-chat-message-${message.id}-row`}
        style={{
          ...aiChatMessageRowStyle,
          ...(isUser ? aiChatMessageUserRowStyle : aiChatMessageAssistantRowStyle),
        }}
      >
        <Surface
          runaComponent={`ai-chat-message-${message.id}-bubble`}
          style={{
            ...aiChatMessageBubbleStyle,
            ...(isUser ? aiChatMessageUserBubbleStyle : aiChatMessageAssistantBubbleStyle),
          }}
        >
          <Text runaComponent={`ai-chat-message-${message.id}-content`} style={aiChatMessageContentStyle}>
            {message.content}
          </Text>
        </Surface>
      </Box>
    </RunaDomScopeProvider>
  )
}
