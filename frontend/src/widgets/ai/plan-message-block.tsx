import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Text } from '@/shared/ui/primitives'

import type { PlanMessage } from '@/features/agent/model/types'
import {
  aiInteractionBlockStyle,
  aiInteractionListItemStyle,
  aiInteractionListStyle,
  aiInteractionMutedTextStyle,
  aiInteractionSectionStyle,
  aiInteractionTitleStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type PlanMessageBlockProps = {
  message: PlanMessage
}

export function PlanMessageBlock({ message }: PlanMessageBlockProps) {
  return (
    <RunaDomScopeProvider component={`plan-message-${message.id}`}>
      <Box runaComponent={`plan-message-${message.id}-root`} style={aiInteractionBlockStyle}>
        <Box runaComponent={`plan-message-${message.id}-plan`} style={aiInteractionSectionStyle}>
          <Text runaComponent={`plan-message-${message.id}-title`} style={aiInteractionTitleStyle}>
            Plan
          </Text>
          <Box runaComponent={`plan-message-${message.id}-steps`} style={aiInteractionListStyle}>
            {message.steps.map((step, index) => (
              <Text
                key={`${message.id}-step-${index + 1}`}
                runaComponent={`plan-message-${message.id}-step-${index + 1}`}
                style={aiInteractionListItemStyle}
              >
                {index + 1}. {step}
              </Text>
            ))}
          </Box>
        </Box>
        <Box runaComponent={`plan-message-${message.id}-tools`} style={aiInteractionSectionStyle}>
          <Text runaComponent={`plan-message-${message.id}-tools-title`} style={aiInteractionTitleStyle}>
            Tools
          </Text>
          <Box runaComponent={`plan-message-${message.id}-tools-list`} style={aiInteractionListStyle}>
            {message.tools.map((tool, index) => (
              <Box
                key={`${message.id}-tool-${tool.name}-${index}`}
                runaComponent={`plan-message-${message.id}-tool-${index + 1}`}
                style={aiInteractionSectionStyle}
              >
                <Text style={aiInteractionListItemStyle}>- {tool.name}</Text>
                {tool.description ? (
                  <Text style={aiInteractionMutedTextStyle}>{tool.description}</Text>
                ) : null}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </RunaDomScopeProvider>
  )
}
