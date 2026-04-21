import { useCallback, useState } from 'react'

import { useAgentPanel } from '@/features/agent/model/use-agent-panel'
import type { AiPanelWidgetState } from '@/features/agent/model/types'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box, ScrollArea } from '@/shared/ui/primitives'

import { ModalHostWidget } from '@/widgets/panel/modal-host-widget'
import { WidgetBusyOverlayWidget } from '@/widgets/panel/widget-busy-overlay-widget'
import { AiChatMessageWidget } from '@/widgets/ai/ai-chat-message-widget'
import { AiComposerWidget } from '@/widgets/ai/ai-composer-widget'
import {
  aiPanelContentColumnStyle,
  aiMessageStackStyle,
  aiPanelRootStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelWidgetProps = {
  hostId: string
  state?: AiPanelWidgetState
}

export function AiPanelWidget({ hostId, state }: AiPanelWidgetProps) {
  const agentPanel = useAgentPanel(hostId, state == null)
  const panelState = state ?? agentPanel.panelState
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
            data-runa-ai-message-stack=""
            runaComponent="ai-panel-message-stack"
            style={aiMessageStackStyle}
          >
            {panelState.messages.map((message) => (
              <AiChatMessageWidget key={message.id} message={message} />
            ))}
          </ScrollArea>
          <AiComposerWidget
            activeTool={panelState.activeTool}
            disabled={state == null ? agentPanel.isSubmitting : false}
            onSubmit={state == null ? agentPanel.submitDraft : undefined}
            onValueChange={state == null ? agentPanel.setDraft : undefined}
            placeholder={panelState.composerPlaceholder}
            submitDisabled={state == null ? agentPanel.isSubmitting || agentPanel.draft.trim() === '' : true}
            toolbarLabel={panelState.toolbarLabel}
            value={state == null ? agentPanel.draft : undefined}
          />
        </Box>
        <ModalHostWidget hostId={hostId} mountNode={panelRootElement} scope="widget" />
        <WidgetBusyOverlayWidget hostId={hostId} mountNode={panelRootElement} />
      </Box>
    </RunaDomScopeProvider>
  )
}
