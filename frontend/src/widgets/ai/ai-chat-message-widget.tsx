import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'

import type {
  ApprovalMessage,
  ChatMessageView,
  ChatMode,
  QuestionnaireMessage,
} from '@/features/agent/model/types'
import {
  aiChatMessageAssistantGroupStyle,
  aiChatMessageAssistantRowStyle,
  aiChatMessageGroupStyle,
  aiChatMessageGroupedRowStyle,
  aiChatMessageRowStyle,
} from '@/widgets/ai/ai-panel-widget.styles'
import { ApprovalMessageBlock } from '@/widgets/ai/approval-message-block'
import { AuditMessageBlock } from '@/widgets/ai/audit-message-block'
import { ChatTextMessageWidget } from '@/widgets/ai/chat-text-message-widget'
import { PlanMessageBlock } from '@/widgets/ai/plan-message-block'
import { QuestionnaireMessageBlock } from '@/widgets/ai/questionnaire-message-block'

export type AiChatMessageWidgetProps = {
  isGroupedWithNext?: boolean
  message: ChatMessageView
  mode: ChatMode
  onApprovalApprove?: (message: ApprovalMessage) => void
  onApprovalCancel?: (message: ApprovalMessage) => void
  onQuestionnaireAnswer?: (message: QuestionnaireMessage, answer: string) => void
}

export function AiChatMessageWidget({
  isGroupedWithNext = false,
  message,
  mode,
  onApprovalApprove,
  onApprovalCancel,
  onQuestionnaireAnswer,
}: AiChatMessageWidgetProps) {
  switch (message.type) {
    case 'questionnaire':
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
              <QuestionnaireMessageBlock message={message} onAnswer={onQuestionnaireAnswer} />
            </Box>
          </Box>
        </RunaDomScopeProvider>
      )
    case 'audit':
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
              <AuditMessageBlock message={message} />
            </Box>
          </Box>
        </RunaDomScopeProvider>
      )
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
