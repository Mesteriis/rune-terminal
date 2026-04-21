import { useCallback, useLayoutEffect, useRef, useState, type UIEvent } from 'react'

import { useAgentPanel } from '@/features/agent/model/use-agent-panel'
import type { AiPanelWidgetState, ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider, useRunaDomAutoTagging } from '@/shared/ui/dom-id'
import { Box, ScrollArea } from '@/shared/ui/primitives'

import { ModalHostWidget } from '@/widgets/panel/modal-host-widget'
import { WidgetBusyOverlayWidget } from '@/widgets/panel/widget-busy-overlay-widget'
import { AiChatMessageWidget } from '@/widgets/ai/ai-chat-message-widget'
import { AiComposerWidget } from '@/widgets/ai/ai-composer-widget'
import {
  aiChatStreamStyle,
  aiMessageViewportStyle,
  aiPanelContentColumnStyle,
  aiPanelRootStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelWidgetProps = {
  hostId: string
  mode?: ChatMode
  state?: AiPanelWidgetState
}

const AI_MESSAGE_LATEST_SCROLL_THRESHOLD = 48

type AiMessageViewportMetrics = {
  initialized: boolean
  isNearLatest: boolean
  scrollHeight: number
  scrollTop: number
}

function readAiMessageViewportMetrics(viewport: HTMLDivElement): AiMessageViewportMetrics {
  const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const distanceToLatest = maxScrollTop - viewport.scrollTop

  return {
    initialized: true,
    isNearLatest: distanceToLatest <= AI_MESSAGE_LATEST_SCROLL_THRESHOLD,
    scrollHeight: viewport.scrollHeight,
    scrollTop: viewport.scrollTop,
  }
}

export function AiPanelWidget({ hostId, mode = 'chat', state }: AiPanelWidgetProps) {
  const agentPanel = useAgentPanel(hostId, state == null)
  const panelState = state ?? agentPanel.panelState
  const autoTagAiPanelRootRef = useRunaDomAutoTagging('ai-panel-root')
  const [panelRootElement, setPanelRootElement] = useState<HTMLDivElement | null>(null)
  const messageViewportRef = useRef<HTMLDivElement | null>(null)
  const messageViewportMetricsRef = useRef<AiMessageViewportMetrics>({
    initialized: false,
    isNearLatest: true,
    scrollHeight: 0,
    scrollTop: 0,
  })
  const handleAiPanelRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      autoTagAiPanelRootRef(node)
      setPanelRootElement(node)
    },
    [autoTagAiPanelRootRef],
  )
  const handleMessageViewportRef = useCallback((node: HTMLDivElement | null) => {
    messageViewportRef.current = node

    if (node) {
      messageViewportMetricsRef.current = readAiMessageViewportMetrics(node)
    }
  }, [])
  const handleMessageViewportScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    messageViewportMetricsRef.current = readAiMessageViewportMetrics(event.currentTarget)
  }, [])

  useLayoutEffect(() => {
    const viewport = messageViewportRef.current

    if (!viewport) {
      return
    }

    const previousMetrics = messageViewportMetricsRef.current

    if (previousMetrics.isNearLatest) {
      viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    } else {
      viewport.scrollTop = Math.min(
        previousMetrics.scrollTop,
        Math.max(0, viewport.scrollHeight - viewport.clientHeight),
      )
    }

    messageViewportMetricsRef.current = readAiMessageViewportMetrics(viewport)
  }, [panelState.messages])

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
            data-runa-ai-message-viewport=""
            onScroll={handleMessageViewportScroll}
            ref={handleMessageViewportRef}
            runaComponent="ai-panel-message-viewport"
            style={aiMessageViewportStyle}
          >
            <Box
              data-runa-ai-message-stream=""
              runaComponent="ai-panel-message-stream"
              style={aiChatStreamStyle}
            >
              {panelState.messages.map((message, index) => {
                const nextMessage = panelState.messages[index + 1]
                const isGroupedWithNext =
                  message.type === 'chat' &&
                  message.role === 'user' &&
                  nextMessage?.type === 'chat' &&
                  nextMessage.role === 'assistant'

                return (
                  <AiChatMessageWidget
                    key={message.id}
                    isGroupedWithNext={isGroupedWithNext}
                    message={message}
                    mode={mode}
                    onApprovalApprove={state == null ? agentPanel.approvePendingPlan : undefined}
                    onApprovalCancel={state == null ? agentPanel.cancelPendingPlan : undefined}
                    onQuestionnaireAnswer={state == null ? agentPanel.answerQuestionnaire : undefined}
                  />
                )
              })}
            </Box>
          </ScrollArea>
          <AiComposerWidget
            activeTool={panelState.activeTool}
            disabled={state == null ? agentPanel.isSubmitting || agentPanel.isInteractionPending : false}
            onSubmit={state == null ? agentPanel.submitDraft : undefined}
            onValueChange={state == null ? agentPanel.setDraft : undefined}
            placeholder={panelState.composerPlaceholder}
            submitDisabled={
              state == null
                ? agentPanel.isSubmitting || agentPanel.isInteractionPending || agentPanel.draft.trim() === ''
                : true
            }
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
