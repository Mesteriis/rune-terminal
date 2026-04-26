import type { DockviewApi } from 'dockview-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useUnit } from 'effector-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { ensureAiTerminalVisibility } from '@/app/ensure-ai-terminal-visibility'
import { useAgentPanel } from '@/features/agent/model/use-agent-panel'
import { $queuedAiPromptHandoff, consumeAiPromptHandoff } from '@/shared/model/ai-handoff'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box } from '@/shared/ui/primitives'
import { AiPanelHeaderWidget, AiPanelWidget } from '@/widgets'

import {
  aiPanelBodyStyle,
  aiPanelFrameStyle,
  aiPanelHeaderStyle,
  aiPanelShellContentStyle,
  aiPanelShellStyle,
  aiResizeHandleStyle,
} from './app-shell.styles'

const AI_PANEL_DEFAULT_RATIO = 0.3
const AI_PANEL_MIN_WIDTH = 320
const AI_PANEL_RESIZE_HANDLE_WIDTH = 6
const AI_PANEL_ANIMATION_SECONDS = 0.84
const AI_PANEL_ANIMATION_EASE = [0.22, 0.61, 0.36, 1] as const
const AI_SHELL_PANEL_HOST_ID = 'ai-shell-panel'
const WORKSPACE_MIN_WIDTH = 420

type AppAiSidebarProps = {
  contentAreaRef: RefObject<HTMLDivElement | null>
  dockviewApiRef: RefObject<DockviewApi | null>
  isOpen: boolean
}

function getDefaultAiPanelWidth() {
  if (typeof window === 'undefined') {
    return 450
  }

  return Math.round(window.innerWidth * AI_PANEL_DEFAULT_RATIO)
}

function clampAiPanelWidth(requestedWidth: number, contentAreaElement: HTMLDivElement | null) {
  if (!contentAreaElement) {
    return Math.max(AI_PANEL_MIN_WIDTH, requestedWidth)
  }

  const maxWidth = Math.max(
    AI_PANEL_MIN_WIDTH,
    contentAreaElement.clientWidth - WORKSPACE_MIN_WIDTH - AI_PANEL_RESIZE_HANDLE_WIDTH,
  )

  return Math.min(Math.max(requestedWidth, AI_PANEL_MIN_WIDTH), maxWidth)
}

/** Renders the shell-managed AI sidebar, including resize behavior and open/close animation. */
export function AppAiSidebar({ dockviewApiRef, isOpen, contentAreaRef }: AppAiSidebarProps) {
  const [aiPanelWidth, setAiPanelWidth] = useState(getDefaultAiPanelWidth())
  const [chatMode, setChatMode] = useState<ChatMode>('chat')
  const [isAiPanelResizing, setIsAiPanelResizing] = useState(false)
  const [pendingAutoSubmitRequestID, setPendingAutoSubmitRequestID] = useState<number | null>(null)
  const aiResizeStartRef = useRef<{ startWidth: number; startX: number } | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const agentPanel = useAgentPanel(AI_SHELL_PANEL_HOST_ID, isOpen, {
    ensureVisibleTerminalTarget: async (input) =>
      ensureAiTerminalVisibility(dockviewApiRef.current, {
        requestedWidgetId: input.requestedWidgetId,
        requestedWidgetTitle: input.requestedWidgetTitle,
      }),
  })
  const [queuedAiPromptHandoff, onConsumeAiPromptHandoff] = useUnit([
    $queuedAiPromptHandoff,
    consumeAiPromptHandoff,
  ])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setAiPanelWidth((width) => clampAiPanelWidth(width, contentAreaRef.current))
  }, [contentAreaRef, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleWindowResize = () => {
      setAiPanelWidth((width) => clampAiPanelWidth(width, contentAreaRef.current))
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [contentAreaRef, isOpen])

  useEffect(() => {
    if (!isAiPanelResizing) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeStart = aiResizeStartRef.current

      if (!resizeStart) {
        return
      }

      const nextWidth = resizeStart.startWidth + (event.clientX - resizeStart.startX)

      setAiPanelWidth(clampAiPanelWidth(nextWidth, contentAreaRef.current))
    }

    const handlePointerUp = () => {
      aiResizeStartRef.current = null
      setIsAiPanelResizing(false)
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [contentAreaRef, isAiPanelResizing])

  useEffect(() => {
    if (!isOpen || queuedAiPromptHandoff == null) {
      return
    }

    if ((queuedAiPromptHandoff.context_widget_ids?.length ?? 0) > 0) {
      agentPanel.setSelectedContextWidgetIDs(queuedAiPromptHandoff.context_widget_ids ?? [])
    }
    agentPanel.setDraft(queuedAiPromptHandoff.prompt)
    setPendingAutoSubmitRequestID(queuedAiPromptHandoff.submit ? queuedAiPromptHandoff.request_id : null)
    onConsumeAiPromptHandoff(queuedAiPromptHandoff.request_id)
  }, [agentPanel, isOpen, onConsumeAiPromptHandoff, queuedAiPromptHandoff])

  useEffect(() => {
    if (pendingAutoSubmitRequestID == null || !isOpen) {
      return
    }

    if (
      agentPanel.draft.trim() === '' ||
      agentPanel.isSubmitting ||
      agentPanel.isConversationPending ||
      agentPanel.isInteractionPending
    ) {
      return
    }

    setPendingAutoSubmitRequestID(null)
    void agentPanel.submitDraft()
  }, [
    agentPanel,
    isOpen,
    pendingAutoSubmitRequestID,
    agentPanel.draft,
    agentPanel.isConversationPending,
    agentPanel.isInteractionPending,
    agentPanel.isSubmitting,
  ])

  const aiShellWidth = aiPanelWidth + AI_PANEL_RESIZE_HANDLE_WIDTH
  const aiWidthTransition =
    isAiPanelResizing || prefersReducedMotion
      ? { duration: 0 }
      : { duration: AI_PANEL_ANIMATION_SECONDS, ease: AI_PANEL_ANIMATION_EASE }

  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          animate={{ width: aiShellWidth }}
          exit={{ width: 0 }}
          initial={{ width: 0 }}
          key="ai-shell-panel"
          style={{
            ...aiPanelShellStyle,
            flex: '0 0 auto',
          }}
          transition={{ width: aiWidthTransition }}
        >
          <RunaDomScopeProvider component="ai-shell-panel" widget={AI_SHELL_PANEL_HOST_ID}>
            <Box runaComponent="ai-shell-panel-content" style={aiPanelShellContentStyle}>
              <Box
                runaComponent="ai-shell-panel-frame-wrap"
                style={{ ...aiPanelFrameStyle, flex: `0 0 ${aiPanelWidth}px`, width: `${aiPanelWidth}px` }}
              >
                <Box
                  data-runa-shell-widget-frame=""
                  data-runa-shell-widget-kind="ai"
                  runaComponent="ai-shell-panel-frame"
                  style={aiPanelFrameStyle}
                >
                  <Box
                    data-runa-shell-widget-header=""
                    runaComponent="ai-shell-panel-header"
                    style={aiPanelHeaderStyle}
                  >
                    <AiPanelHeaderWidget
                      activeConversation={agentPanel.activeConversationSummary}
                      activeConversationID={agentPanel.activeConversationID}
                      activeProviderRoute={
                        agentPanel.activeProviderGateway
                          ? {
                              displayName: agentPanel.activeProviderGateway.display_name,
                              model: agentPanel.activeProviderGateway.model,
                              routeReady: agentPanel.activeProviderGateway.route_ready,
                              routeStatusState: agentPanel.activeProviderGateway.route_status_state,
                              routeStatusMessage: agentPanel.activeProviderGateway.route_status_message,
                              routePrepared: agentPanel.activeProviderGateway.route_prepared,
                              routePrepareState: agentPanel.activeProviderGateway.route_prepare_state,
                              routePrepareMessage: agentPanel.activeProviderGateway.route_prepare_message,
                              routeLatencyMS: agentPanel.activeProviderGateway.route_latency_ms,
                              routePrepareLatencyMS:
                                agentPanel.activeProviderGateway.route_prepare_latency_ms,
                              lastFirstResponseLatencyMS:
                                agentPanel.activeProviderGateway.last_first_response_latency_ms,
                            }
                          : null
                      }
                      conversationCounts={agentPanel.conversationCounts}
                      conversationScope={agentPanel.conversationScope}
                      conversationSearchQuery={agentPanel.conversationSearchQuery}
                      conversations={agentPanel.conversations}
                      isConversationBusy={
                        agentPanel.isConversationPending ||
                        agentPanel.isSubmitting ||
                        agentPanel.isInteractionPending
                      }
                      isProviderRouteBusy={
                        agentPanel.isProviderGatewayPending || agentPanel.isProviderRoutePreparing
                      }
                      onConversationScopeChange={agentPanel.setConversationScope}
                      onConversationSearchQueryChange={agentPanel.setConversationSearchQuery}
                      mode={chatMode}
                      onConversationSelect={(conversationID) => {
                        void agentPanel.switchConversation(conversationID)
                      }}
                      onCreateConversation={() => {
                        void agentPanel.createConversation()
                      }}
                      onArchiveConversation={(conversationID) =>
                        agentPanel.archiveConversation(conversationID)
                      }
                      onDeleteConversation={(conversationID) => agentPanel.deleteConversation(conversationID)}
                      onPrewarmProviderRoute={() => agentPanel.prewarmActiveProviderRoute()}
                      onRenameConversation={(conversationID, title) =>
                        agentPanel.renameConversation(conversationID, title)
                      }
                      onRestoreConversation={(conversationID) =>
                        agentPanel.restoreConversation(conversationID)
                      }
                      onModeChange={setChatMode}
                      providerRouteError={agentPanel.providerGatewayError}
                      title="AI Rune"
                    />
                  </Box>
                  <Box runaComponent="ai-shell-panel-body" style={aiPanelBodyStyle}>
                    <AiPanelWidget controller={agentPanel} hostId={AI_SHELL_PANEL_HOST_ID} mode={chatMode} />
                  </Box>
                </Box>
              </Box>
              <Box
                aria-hidden="true"
                data-runa-shell-sash=""
                onPointerDown={(event) => {
                  aiResizeStartRef.current = {
                    startWidth: aiPanelWidth,
                    startX: event.clientX,
                  }
                  setIsAiPanelResizing(true)
                  event.preventDefault()
                }}
                runaComponent="ai-shell-panel-sash"
                style={aiResizeHandleStyle}
              />
            </Box>
          </RunaDomScopeProvider>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
