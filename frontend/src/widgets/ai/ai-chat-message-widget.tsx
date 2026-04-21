import { useMemo, useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Surface, Text } from '@/shared/ui/primitives'

import type { ChatMessageView } from '@/features/agent/model/types'
import {
  aiChatMessageContentStyle,
  aiChatMessageBubbleStyle,
  aiChatMessageDetailsLabelStyle,
  aiChatMessageDetailsPanelStyle,
  aiChatMessageDetailsSectionStyle,
  aiChatMessageDetailsTextStyle,
  aiChatMessageDetailsToggleStyle,
  aiChatMessageDetailsValueStyle,
  aiChatMessageGroupStyle,
  aiChatMessageRowStyle,
  aiChatMessageAssistantBubbleStyle,
  aiChatMessageAssistantGroupStyle,
  aiChatMessageAssistantRowStyle,
  aiChatMessageUserBubbleStyle,
  aiChatMessageUserGroupStyle,
  aiChatMessageUserRowStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiChatMessageWidgetProps = {
  message: ChatMessageView
}

export function AiChatMessageWidget({ message }: AiChatMessageWidgetProps) {
  const isUser = message.role === 'user'
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const details = useMemo(() => {
    const meta = message.meta

    if (!meta) {
      return []
    }

    const metadataLines = [
      meta.provider ? `Provider: ${meta.provider}` : null,
      meta.model ? `Model: ${meta.model}` : null,
      meta.status ? `Status: ${meta.status}` : null,
    ].filter(Boolean)

    return [
      meta.prompt ? { id: 'prompt', label: 'Prompt', value: meta.prompt } : null,
      meta.reasoning ? { id: 'reasoning', label: 'Reasoning', value: meta.reasoning } : null,
      meta.summary ? { id: 'summary', label: 'Summary', value: meta.summary } : null,
      metadataLines.length > 0
        ? { id: 'metadata', label: 'Metadata', value: metadataLines.join('\n') }
        : null,
    ].filter(Boolean) as Array<{ id: string; label: string; value: string }>
  }, [message.meta])
  const hasDetails = !isUser && details.length > 0

  return (
    <RunaDomScopeProvider component={`ai-chat-message-${message.id}`}>
      <Box
        runaComponent={`ai-chat-message-${message.id}-row`}
        style={{
          ...aiChatMessageRowStyle,
          ...(isUser ? aiChatMessageUserRowStyle : aiChatMessageAssistantRowStyle),
        }}
      >
        <Box
          runaComponent={`ai-chat-message-${message.id}-group`}
          style={{
            ...aiChatMessageGroupStyle,
            ...(isUser ? aiChatMessageUserGroupStyle : aiChatMessageAssistantGroupStyle),
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
          {hasDetails ? (
            <>
              <Button
                aria-expanded={isDetailsOpen}
                onClick={() => setIsDetailsOpen((value) => !value)}
                runaComponent={`ai-chat-message-${message.id}-details-toggle`}
                style={aiChatMessageDetailsToggleStyle}
              >
                {isDetailsOpen ? 'Hide details' : 'Show details'}
              </Button>
              {isDetailsOpen ? (
                <Surface
                  runaComponent={`ai-chat-message-${message.id}-details`}
                  style={aiChatMessageDetailsPanelStyle}
                >
                  {details.map((detail) => (
                    <Box
                      key={detail.id}
                      runaComponent={`ai-chat-message-${message.id}-details-${detail.id}`}
                      style={aiChatMessageDetailsSectionStyle}
                    >
                      <Text
                        runaComponent={`ai-chat-message-${message.id}-details-${detail.id}-label`}
                        style={aiChatMessageDetailsLabelStyle}
                      >
                        {detail.label}
                      </Text>
                      <Text
                        runaComponent={`ai-chat-message-${message.id}-details-${detail.id}-value`}
                        style={{
                          ...aiChatMessageDetailsTextStyle,
                          ...aiChatMessageDetailsValueStyle,
                        }}
                      >
                        {detail.value}
                      </Text>
                    </Box>
                  ))}
                </Surface>
              ) : null}
            </>
          ) : null}
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
