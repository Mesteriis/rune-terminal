import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'

import type { AuditEntryStatus, AuditMessage } from '@/features/agent/model/types'
import {
  aiAuditEntryMetaStyle,
  aiAuditEntryRowStyle,
  aiAuditEntryStatusDoneStyle,
  aiAuditEntryStatusErrorStyle,
  aiAuditEntryStatusPendingStyle,
  aiAuditEntryStatusRunningStyle,
  aiInteractionBlockStyle,
  aiInteractionListStyle,
  aiInteractionSectionStyle,
  aiInteractionTitleStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

function formatAuditTimestamp(timestamp: number | undefined) {
  if (timestamp == null) {
    return ''
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(11, 19)
}

function getAuditStatusStyle(status: AuditEntryStatus) {
  switch (status) {
    case 'done':
      return aiAuditEntryStatusDoneStyle
    case 'error':
      return aiAuditEntryStatusErrorStyle
    case 'running':
      return aiAuditEntryStatusRunningStyle
    case 'pending':
    default:
      return aiAuditEntryStatusPendingStyle
  }
}

export type AuditMessageBlockProps = {
  message: AuditMessage
}

export function AuditMessageBlock({ message }: AuditMessageBlockProps) {
  return (
    <RunaDomScopeProvider component={`audit-message-${message.id}`}>
      <Box runaComponent={`audit-message-${message.id}-root`} style={aiInteractionBlockStyle}>
        <Box runaComponent={`audit-message-${message.id}-content`} style={aiInteractionSectionStyle}>
          <Text runaComponent={`audit-message-${message.id}-title`} style={aiInteractionTitleStyle}>
            Execution
          </Text>
          <Box runaComponent={`audit-message-${message.id}-entries`} style={aiInteractionListStyle}>
            {message.entries.map((entry, index) => {
              const timestampLabel = formatAuditTimestamp(entry.timestamp)

              return (
                <Box
                  key={`${message.id}-entry-${entry.tool}-${index}`}
                  runaComponent={`audit-message-${message.id}-entry-${index + 1}`}
                  style={aiAuditEntryRowStyle}
                >
                  <Text
                    runaComponent={`audit-message-${message.id}-entry-${index + 1}-status`}
                    style={getAuditStatusStyle(entry.status)}
                  >
                    {entry.status}
                  </Text>
                  <Text runaComponent={`audit-message-${message.id}-entry-${index + 1}-tool`}>
                    {entry.tool}
                  </Text>
                  {timestampLabel ? (
                    <Text
                      runaComponent={`audit-message-${message.id}-entry-${index + 1}-timestamp`}
                      style={aiAuditEntryMetaStyle}
                    >
                      {timestampLabel}
                    </Text>
                  ) : null}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
