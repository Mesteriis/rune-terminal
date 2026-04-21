import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'

import type { MessageMeta } from '@/features/agent/model/types'
import {
  aiMessageBubbleAssistantStyle,
  aiMessageBubbleContentStyle,
  aiMessageBubbleStyle,
  aiMessageBubbleUserStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type MessageBubbleProps = {
  content: string
  meta?: MessageMeta
  role: 'user' | 'assistant'
  scopeId: string
}

export function MessageBubble({ content, role, scopeId }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <RunaDomScopeProvider component={`message-bubble-${scopeId}`}>
      <Box
        runaComponent={`message-bubble-${scopeId}-root`}
        style={{
          ...aiMessageBubbleStyle,
          ...(isUser ? aiMessageBubbleUserStyle : aiMessageBubbleAssistantStyle),
        }}
      >
        <Text runaComponent={`message-bubble-${scopeId}-content`} style={aiMessageBubbleContentStyle}>
          {content}
        </Text>
      </Box>
    </RunaDomScopeProvider>
  )
}
