import { Copy, FileText, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { IconButton } from '../shared/ui/components'
import { Box, Separator, Surface, Text } from '../shared/ui/primitives'

import type { AiPromptCardState } from './ai-panel-widget.mock'
import {
  aiPromptCardActionRowStyle,
  aiPromptCardActionStyle,
  aiPromptCardExpandedBodyStyle,
  aiPromptCardHeaderStyle,
  aiPromptCardPreviewStyle,
  aiPromptCardSectionLabelStyle,
  aiPromptCardSectionStyle,
  aiPromptCardSectionTextStyle,
  aiPromptCardTitleClusterStyle,
  aiPromptCardStyle,
  aiPromptSubtitleStyle,
  aiPromptTitleStyle,
} from './ai-panel-widget.styles'

export type AiPromptCardWidgetProps = {
  prompt: AiPromptCardState
}

export function AiPromptCardWidget({ prompt }: AiPromptCardWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRollbackApplied, setIsRollbackApplied] = useState(false)

  const activeSnapshot = useMemo(() => {
    if (isRollbackApplied && prompt.rollback) {
      return prompt.rollback
    }

    return prompt.current
  }, [isRollbackApplied, prompt.current, prompt.rollback])

  const handleCopy = async (value: string) => {
    if (typeof navigator === 'undefined' || navigator.clipboard == null) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Keep this UI-only slice silent if clipboard access is unavailable.
    }
  }

  const handleToggleExpanded = () => {
    setIsExpanded((value) => !value)
  }

  const handleToggleRollback = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (!prompt.rollback) {
      return
    }

    setIsRollbackApplied((value) => !value)
  }

  return (
    <Surface
      aria-expanded={isExpanded}
      role="button"
      style={aiPromptCardStyle}
      tabIndex={0}
      onClick={handleToggleExpanded}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleToggleExpanded()
        }
      }}
    >
      <Box style={aiPromptCardHeaderStyle}>
        <Box style={aiPromptCardTitleClusterStyle}>
          <Text style={aiPromptTitleStyle}>{prompt.title}</Text>
          <Text style={aiPromptSubtitleStyle}>
            {isRollbackApplied ? 'Rollback snapshot' : 'Current snapshot'}
          </Text>
        </Box>
        <Box style={aiPromptCardActionRowStyle}>
          <IconButton
            aria-label={`Copy prompt for ${prompt.title}`}
            size="sm"
            style={aiPromptCardActionStyle}
            onClick={(event) => {
              event.stopPropagation()
              void handleCopy(activeSnapshot.prompt)
            }}
          >
            <Copy size={14} strokeWidth={1.8} />
          </IconButton>
          <IconButton
            aria-label={`Toggle rollback for ${prompt.title}`}
            size="sm"
            style={aiPromptCardActionStyle}
            onClick={handleToggleRollback}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </IconButton>
          <IconButton
            aria-label={`Copy summary for ${prompt.title}`}
            size="sm"
            style={aiPromptCardActionStyle}
            onClick={(event) => {
              event.stopPropagation()
              void handleCopy(activeSnapshot.summary)
            }}
          >
            <FileText size={14} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Box>
      {!isExpanded ? (
        <Text style={aiPromptCardPreviewStyle}>{activeSnapshot.preview}</Text>
      ) : (
        <Box style={aiPromptCardExpandedBodyStyle}>
          <Separator />
          <Box style={aiPromptCardSectionStyle}>
            <Text style={aiPromptCardSectionLabelStyle}>Prompt</Text>
            <Text style={aiPromptCardSectionTextStyle}>{activeSnapshot.prompt}</Text>
          </Box>
          <Box style={aiPromptCardSectionStyle}>
            <Text style={aiPromptCardSectionLabelStyle}>Reasoning</Text>
            <Text style={aiPromptCardSectionTextStyle}>{activeSnapshot.reasoning}</Text>
          </Box>
          <Box style={aiPromptCardSectionStyle}>
            <Text style={aiPromptCardSectionLabelStyle}>Summary</Text>
            <Text style={aiPromptCardSectionTextStyle}>{activeSnapshot.summary}</Text>
          </Box>
        </Box>
      )}
    </Surface>
  )
}
