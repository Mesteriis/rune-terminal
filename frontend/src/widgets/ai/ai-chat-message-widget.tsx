import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'

import type { ApprovalMessage, ChatMessageView, ChatMode } from '@/features/agent/model/types'
import {
  aiChatMessageAssistantGroupStyle,
  aiChatMessageAssistantRowStyle,
  aiChatMessageGroupStyle,
  aiChatMessageGroupedRowStyle,
  aiChatMessageRowStyle,
} from '@/widgets/ai/ai-panel-widget.styles'
import { ApprovalMessageBlock } from '@/widgets/ai/approval-message-block'
import { ChatTextMessageWidget } from '@/widgets/ai/chat-text-message-widget'
import { PlanMessageBlock } from '@/widgets/ai/plan-message-block'

export type AiChatMessageWidgetProps = {
  isGroupedWithNext?: boolean
  message: ChatMessageView
  mode: ChatMode
  onApprovalApprove?: (message: ApprovalMessage) => void
  onApprovalCancel?: (message: ApprovalMessage) => void
}

export function AiChatMessageWidget({
  isGroupedWithNext = false,
  message,
  mode,
  onApprovalApprove,
  onApprovalCancel,
}: AiChatMessageWidgetProps) {
  switch (message.type) {
    case 'approval':
      return (
        <RunaDomScopeProvider component={`ai-chat-message-${message.id}`}>
          <Box
            runaComponent={`ai-chat-message-${message.id}-row`}
            style={{
              ...aiChatMessageRowStyle,
              ...(isGroupedWithNext ? aiChatMessageGroupedRowStyle : null),
              ...aiChatMessageAssistantRowStyle,
            }}
          >
            <Box
              runaComponent={`ai-chat-message-${message.id}-group`}
              style={{
                ...aiChatMessageGroupStyle,
                ...aiChatMessageAssistantGroupStyle,
              }}
            >
              <ApprovalMessageBlock
                message={message}
                onApprove={onApprovalApprove}
                onCancel={onApprovalCancel}
              />
            </Box>
          </Box>
        </RunaDomScopeProvider>
      )
    case 'plan':
      return (
        <RunaDomScopeProvider component={`ai-chat-message-${message.id}`}>
          <Box
            runaComponent={`ai-chat-message-${message.id}-row`}
            style={{
              ...aiChatMessageRowStyle,
              ...(isGroupedWithNext ? aiChatMessageGroupedRowStyle : null),
              ...aiChatMessageAssistantRowStyle,
            }}
          >
            <Box
              runaComponent={`ai-chat-message-${message.id}-group`}
              style={{
                ...aiChatMessageGroupStyle,
                ...aiChatMessageAssistantGroupStyle,
              }}
            >
              <PlanMessageBlock message={message} />
            </Box>
          </Box>
        </RunaDomScopeProvider>
      )
    case 'chat':
    default:
      return <ChatTextMessageWidget isGroupedWithNext={isGroupedWithNext} message={message} mode={mode} />
  }
}
