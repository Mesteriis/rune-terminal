import { Box } from '../shared/ui/primitives'

import { ModalHostWidget } from './modal-host-widget'
import { WidgetBusyOverlayWidget } from './widget-busy-overlay-widget'
import { AiComposerWidget } from './ai-composer-widget'
import { AiPromptCardWidget } from './ai-prompt-card-widget'
import { aiPanelWidgetMockState, type AiPanelWidgetMockState } from './ai-panel-widget.mock'
import {
  aiPanelContentColumnStyle,
  aiPanelRootStyle,
  aiPromptStackStyle,
} from './ai-panel-widget.styles'

export type AiPanelWidgetProps = {
  hostId: string
  state?: AiPanelWidgetMockState
}

export function AiPanelWidget({
  hostId,
  state = aiPanelWidgetMockState,
}: AiPanelWidgetProps) {
  return (
    <Box data-runa-modal-anchor={hostId} style={aiPanelRootStyle}>
      <Box data-runa-ai-shell-frame="" style={aiPanelContentColumnStyle}>
        <Box data-runa-ai-prompt-stack="" style={aiPromptStackStyle}>
          {state.prompts.map((prompt) => (
            <AiPromptCardWidget key={prompt.id} prompt={prompt} />
          ))}
        </Box>
        <AiComposerWidget
          activeTool={state.activeTool}
          placeholder={state.composerPlaceholder}
          toolbarLabel={state.toolbarLabel}
        />
      </Box>
      <ModalHostWidget hostId={hostId} scope="widget" />
      <WidgetBusyOverlayWidget hostId={hostId} />
    </Box>
  )
}
