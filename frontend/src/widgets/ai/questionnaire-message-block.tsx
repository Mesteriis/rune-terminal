import { useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Input, Text } from '@/shared/ui/primitives'

import type { QuestionnaireMessage } from '@/features/agent/model/types'
import {
  aiInteractionBlockStyle,
  aiInteractionMutedTextStyle,
  aiInteractionSectionStyle,
  aiInteractionTitleStyle,
  aiQuestionnaireActionsStyle,
  aiQuestionnaireInputRowStyle,
  aiQuestionnaireOptionButtonStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type QuestionnaireMessageBlockProps = {
  message: QuestionnaireMessage
  onAnswer?: (message: QuestionnaireMessage, answer: string) => void
}

export function QuestionnaireMessageBlock({ message, onAnswer }: QuestionnaireMessageBlockProps) {
  const [customValue, setCustomValue] = useState('')
  const isPending = message.status === 'pending'

  return (
    <RunaDomScopeProvider component={`questionnaire-message-${message.id}`}>
      <Box runaComponent={`questionnaire-message-${message.id}-root`} style={aiInteractionBlockStyle}>
        <Box runaComponent={`questionnaire-message-${message.id}-content`} style={aiInteractionSectionStyle}>
          <Text runaComponent={`questionnaire-message-${message.id}-title`} style={aiInteractionTitleStyle}>
            Question
          </Text>
          <Text runaComponent={`questionnaire-message-${message.id}-question`}>{message.question}</Text>
          {message.answer ? (
            <Text
              runaComponent={`questionnaire-message-${message.id}-answer`}
              style={aiInteractionMutedTextStyle}
            >
              Answer: {message.answer}
            </Text>
          ) : null}
        </Box>
        {isPending ? (
          <Box
            runaComponent={`questionnaire-message-${message.id}-actions`}
            style={aiQuestionnaireActionsStyle}
          >
            {message.options.map((option, index) => (
              <Button
                key={`${message.id}-option-${option.value}-${index}`}
                onClick={() => onAnswer?.(message, option.value)}
                runaComponent={`questionnaire-message-${message.id}-option-${index + 1}`}
                style={aiQuestionnaireOptionButtonStyle}
              >
                {option.label}
              </Button>
            ))}
            {message.allowCustom ? (
              <Box
                runaComponent={`questionnaire-message-${message.id}-custom`}
                style={aiQuestionnaireInputRowStyle}
              >
                <Input
                  onChange={(event) => {
                    setCustomValue(event.currentTarget.value)
                  }}
                  placeholder="Custom input"
                  runaComponent={`questionnaire-message-${message.id}-custom-input`}
                  value={customValue}
                />
                <Button
                  disabled={customValue.trim() === ''}
                  onClick={() => {
                    const answer = customValue.trim()

                    if (!answer) {
                      return
                    }

                    onAnswer?.(message, answer)
                    setCustomValue('')
                  }}
                  runaComponent={`questionnaire-message-${message.id}-custom-submit`}
                  style={aiQuestionnaireOptionButtonStyle}
                >
                  Submit
                </Button>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </RunaDomScopeProvider>
  )
}
