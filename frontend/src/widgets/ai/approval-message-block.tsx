import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Text } from '@/shared/ui/primitives'

import type { ApprovalMessage } from '@/features/agent/model/types'
import {
  aiApprovalActionsStyle,
  aiApprovalButtonStyle,
  aiApprovalCancelButtonStyle,
  aiApprovalStatusStyle,
  aiInteractionBlockStyle,
  aiInteractionMutedTextStyle,
  aiInteractionSectionStyle,
  aiInteractionTitleStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type ApprovalMessageBlockProps = {
  message: ApprovalMessage
  onApprove?: (message: ApprovalMessage) => void
  onCancel?: (message: ApprovalMessage) => void
}

export function ApprovalMessageBlock({ message, onApprove, onCancel }: ApprovalMessageBlockProps) {
  const isPending = message.status === 'pending'
  const statusLabel =
    message.status === 'approved'
      ? 'Execution approved.'
      : message.status === 'cancelled'
        ? 'Execution cancelled.'
        : 'Approval required before execution.'

  return (
    <RunaDomScopeProvider component={`approval-message-${message.id}`}>
      <Box runaComponent={`approval-message-${message.id}-root`} style={aiInteractionBlockStyle}>
        <Box runaComponent={`approval-message-${message.id}-content`} style={aiInteractionSectionStyle}>
          <Text runaComponent={`approval-message-${message.id}-title`} style={aiInteractionTitleStyle}>
            Approval
          </Text>
          <Text runaComponent={`approval-message-${message.id}-status`} style={aiApprovalStatusStyle}>
            {statusLabel}
          </Text>
          <Text runaComponent={`approval-message-${message.id}-meta`} style={aiInteractionMutedTextStyle}>
            Plan {message.planId}
          </Text>
        </Box>
        {isPending ? (
          <Box runaComponent={`approval-message-${message.id}-actions`} style={aiApprovalActionsStyle}>
            <Button
              onClick={() => onApprove?.(message)}
              runaComponent={`approval-message-${message.id}-approve`}
              style={aiApprovalButtonStyle}
            >
              Approve
            </Button>
            <Button
              onClick={() => onCancel?.(message)}
              runaComponent={`approval-message-${message.id}-cancel`}
              style={aiApprovalCancelButtonStyle}
            >
              Cancel
            </Button>
          </Box>
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
