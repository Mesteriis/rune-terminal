import { useCallback, useState } from 'react'

import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box, ScrollArea } from '@/shared/ui/primitives'

import { ModalHostWidget } from '@/widgets/panel/modal-host-widget'
import { WidgetBusyOverlayWidget } from '@/widgets/panel/widget-busy-overlay-widget'
import { AiComposerWidget } from '@/widgets/ai/ai-composer-widget'
import { AiPromptCardWidget } from '@/widgets/ai/ai-prompt-card-widget'
import { aiPanelWidgetMockState, type AiPanelWidgetMockState } from '@/widgets/ai/ai-panel-widget.mock'
import {
  aiPanelContentColumnStyle,
  aiPanelRootStyle,
  aiPromptStackStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelWidgetProps = {
  hostId: string
  state?: AiPanelWidgetMockState
}

export function AiPanelWidget({ hostId, state = aiPanelWidgetMockState }: AiPanelWidgetProps) {
  const lastPromptId = state.prompts[state.prompts.length - 1]?.id
  const autoTagAiPanelRootRef = useRunaDomAutoTagging('ai-panel-root')
  const [panelRootElement, setPanelRootElement] = useState<HTMLDivElement | null>(null)
  const handleAiPanelRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      autoTagAiPanelRootRef(node)
      setPanelRootElement(node)
    },
    [autoTagAiPanelRootRef],
  )

  return (
    <RunaDomScopeProvider component="ai-panel-widget" widget={hostId}>
      <Box
        data-runa-modal-anchor={hostId}
        ref={handleAiPanelRootRef}
        runaComponent="ai-panel-root"
        style={aiPanelRootStyle}
      >
        <Box data-runa-ai-shell-frame="" runaComponent="ai-panel-frame" style={aiPanelContentColumnStyle}>
          <ScrollArea
            data-runa-ai-prompt-stack=""
            runaComponent="ai-panel-prompt-stack"
            style={aiPromptStackStyle}
          >
            {state.prompts.map((prompt) => (
              <AiPromptCardWidget
                key={prompt.id}
                defaultExpanded={prompt.id === lastPromptId}
                forceExpanded={prompt.id === lastPromptId}
                prompt={prompt}
              />
            ))}
          </ScrollArea>
          <AiComposerWidget
            activeTool={state.activeTool}
            placeholder={state.composerPlaceholder}
            toolbarLabel={state.toolbarLabel}
          />
        </Box>
        <ModalHostWidget hostId={hostId} mountNode={panelRootElement} scope="widget" />
        <WidgetBusyOverlayWidget hostId={hostId} mountNode={panelRootElement} />
      </Box>
    </RunaDomScopeProvider>
  )
}
