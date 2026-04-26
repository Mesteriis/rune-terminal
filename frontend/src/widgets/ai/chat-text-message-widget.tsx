import { useEffect, useMemo, useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Text } from '@/shared/ui/primitives'

import type { ChatMode, ChatTextMessage } from '@/features/agent/model/types'
import {
  aiChatMessageAssistantGroupStyle,
  aiChatMessageAssistantRowStyle,
  aiChatMessageDetailsHeaderMetaStyle,
  aiChatMessageDetailsHeaderStyle,
  aiChatMessageDetailsHeaderTitleStyle,
  aiChatMessageDetailsLabelStyle,
  aiChatMessageDetailsPanelStyle,
  aiChatMessageDetailsSectionStyle,
  aiChatMessageDetailsTextStyle,
  aiChatMessageDetailsToggleStyle,
  aiChatMessageDetailsValueStyle,
  aiChatMessageGroupStyle,
  aiChatMessageGroupedRowStyle,
  aiChatMessageMetaBadgeStyle,
  aiChatMessageMetaBarStyle,
  aiChatMessageMetaLineStyle,
  aiChatMessageRowStyle,
  aiChatMessageUserGroupStyle,
  aiChatMessageUserRowStyle,
  aiComposerContextStripRowStyle,
  aiToolbarChipStyle,
} from '@/widgets/ai/ai-panel-widget.styles'
import { MessageBubble } from '@/widgets/ai/message-bubble'

export type ChatTextMessageWidgetProps = {
  isGroupedWithNext?: boolean
  message: ChatTextMessage
  mode: ChatMode
}

export function ChatTextMessageWidget({
  isGroupedWithNext = false,
  message,
  mode,
}: ChatTextMessageWidgetProps) {
  const isUser = message.role === 'user'
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const attachments = message.attachments ?? []
  const metaLine = !isUser
    ? [message.meta?.model ?? message.meta?.provider, message.meta?.status].filter(Boolean).join(' · ')
    : ''
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
  const isDetailsVisible = hasDetails && (mode === 'debug' || isDetailsOpen)
  const showMetaBar = Boolean(metaLine) || hasDetails

  useEffect(() => {
    setIsDetailsOpen(mode !== 'chat')
  }, [mode])

  return (
    <RunaDomScopeProvider component={`ai-chat-message-${message.id}`}>
      <Box
        data-runa-chat-role={message.role}
        runaComponent={`ai-chat-message-${message.id}-row`}
        style={{
          ...aiChatMessageRowStyle,
          ...(isGroupedWithNext ? aiChatMessageGroupedRowStyle : null),
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
          <MessageBubble
            content={message.content}
            meta={message.meta}
            role={message.role}
            scopeId={message.id}
          />
          {attachments.length > 0 ? (
            <Box
              aria-label={`Attachments for ${message.role} message`}
              runaComponent={`ai-chat-message-${message.id}-attachments`}
              style={aiComposerContextStripRowStyle}
            >
              {attachments.map((attachment) => (
                <Box
                  key={attachment.id}
                  runaComponent={`ai-chat-message-${message.id}-attachment`}
                  style={aiToolbarChipStyle}
                >
                  <Text runaComponent={`ai-chat-message-${message.id}-attachment-name`}>
                    {attachment.name}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : null}
          {showMetaBar ? (
            <Box runaComponent={`ai-chat-message-${message.id}-meta-bar`} style={aiChatMessageMetaBarStyle}>
              {metaLine ? (
                <Box
                  runaComponent={`ai-chat-message-${message.id}-meta-badge`}
                  style={aiChatMessageMetaBadgeStyle}
                >
                  <Text
                    runaComponent={`ai-chat-message-${message.id}-meta`}
                    style={aiChatMessageMetaLineStyle}
                  >
                    {metaLine}
                  </Text>
                </Box>
              ) : (
                <Box aria-hidden="true" style={{ flex: 1, minWidth: 0 }} />
              )}
              {hasDetails && mode !== 'debug' ? (
                <Button
                  aria-expanded={isDetailsVisible}
                  onClick={() => setIsDetailsOpen((value) => !value)}
                  runaComponent={`ai-chat-message-${message.id}-details-toggle`}
                  style={aiChatMessageDetailsToggleStyle}
                >
                  {isDetailsVisible ? 'Hide details' : 'Show details'}
                </Button>
              ) : null}
            </Box>
          ) : null}
          {hasDetails ? (
            <>
              {isDetailsVisible ? (
                <Box
                  runaComponent={`ai-chat-message-${message.id}-details`}
                  style={aiChatMessageDetailsPanelStyle}
                >
                  <Box
                    runaComponent={`ai-chat-message-${message.id}-details-header`}
                    style={aiChatMessageDetailsHeaderStyle}
                  >
                    <Text
                      runaComponent={`ai-chat-message-${message.id}-details-title`}
                      style={aiChatMessageDetailsHeaderTitleStyle}
                    >
                      Request details
                    </Text>
                    <Text
                      runaComponent={`ai-chat-message-${message.id}-details-meta`}
                      style={aiChatMessageDetailsHeaderMetaStyle}
                    >
                      {details.length} {details.length === 1 ? 'field' : 'fields'}
                    </Text>
                  </Box>
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
                </Box>
              ) : null}
            </>
          ) : null}
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
