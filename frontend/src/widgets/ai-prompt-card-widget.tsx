import { Surface, Text } from '../shared/ui/primitives'

import type { AiPromptCardState } from './ai-panel-widget.mock'
import {
  aiPromptCardStyle,
  aiPromptSubtitleStyle,
  aiPromptTitleStyle,
} from './ai-panel-widget.styles'

export type AiPromptCardWidgetProps = {
  prompt: AiPromptCardState
}

export function AiPromptCardWidget({ prompt }: AiPromptCardWidgetProps) {
  return (
    <Surface style={aiPromptCardStyle}>
      <Text style={aiPromptTitleStyle}>{prompt.title}</Text>
      <Text style={aiPromptSubtitleStyle}>{prompt.subtitle}</Text>
    </Surface>
  )
}
