import { useCallback, useLayoutEffect, useRef, useState, type UIEvent } from 'react'

import { useAgentPanel, type AgentPanelController } from '@/features/agent/model/use-agent-panel'
import { useAiComposerPreferences } from '@/features/agent/model/use-ai-composer-preferences'
import type { AiPanelWidgetState, ChatMode } from '@/features/agent/model/types'
import type { AppLocale } from '@/shared/api/runtime'
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
  controller?: AgentPanelController
  hostId: string
  locale?: AppLocale
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

export function AiPanelWidget({
  controller,
  hostId,
  locale = 'en',
  mode = 'chat',
  state,
}: AiPanelWidgetProps) {
  const internalAgentPanel = useAgentPanel(hostId, state == null && controller == null)
  const agentPanel = controller ?? internalAgentPanel
  const { submitMode } = useAiComposerPreferences()
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
                    onReuseAttachment={state == null ? agentPanel.reuseStoredAttachmentReference : undefined}
                  />
                )
              })}
            </Box>
          </ScrollArea>
          <AiComposerWidget
            activeTool={panelState.activeTool}
            attachments={state == null ? agentPanel.queuedAttachmentReferences : undefined}
            availableModels={state == null ? agentPanel.availableModels : undefined}
            availableModes={state == null ? agentPanel.availableModes : undefined}
            availableProfiles={state == null ? agentPanel.availableProfiles : undefined}
            availableProviders={state == null ? agentPanel.availableProviders : undefined}
            availableRoles={state == null ? agentPanel.availableRoles : undefined}
            activeContextWidgetID={state == null ? agentPanel.activeContextWidgetID : undefined}
            activeContextWidgetOption={state == null ? agentPanel.activeContextWidgetOption : undefined}
            contextWidgetLoadError={state == null ? agentPanel.contextWidgetLoadError : undefined}
            contextWidgetOptions={state == null ? agentPanel.contextWidgetOptions : undefined}
            disabled={
              state == null
                ? agentPanel.isSubmitting ||
                  agentPanel.isInteractionPending ||
                  agentPanel.isConversationPending
                : false
            }
            isWidgetContextEnabled={state == null ? agentPanel.isWidgetContextEnabled : undefined}
            isSubmitting={state == null ? agentPanel.isSubmitting && agentPanel.isResponseCancellable : false}
            isAttachmentLibraryPending={state == null ? agentPanel.isAttachmentLibraryPending : false}
            locale={locale}
            missingContextWidgetCount={state == null ? agentPanel.missingContextWidgetCount : undefined}
            onCancelSubmit={state == null ? agentPanel.cancelActiveSubmission : undefined}
            onContextOptionsOpen={state == null ? agentPanel.handleContextOptionsOpen : undefined}
            onContextOnlyUseCurrentWidget={
              state == null ? () => void agentPanel.useCurrentContextWidget('replace') : undefined
            }
            onRepairMissingContextWidgets={
              state == null ? () => void agentPanel.repairMissingContextWidgets() : undefined
            }
            onContextUseDefault={
              state == null ? () => void agentPanel.resetContextWidgetSelection() : undefined
            }
            onContextUseCurrentWidget={
              state == null ? () => void agentPanel.useCurrentContextWidget('append') : undefined
            }
            onContextUseAllWidgets={state == null ? () => void agentPanel.useAllContextWidgets() : undefined}
            onModelChange={state == null ? agentPanel.setSelectedModel : undefined}
            onModeChange={state == null ? agentPanel.selectMode : undefined}
            onProfileChange={state == null ? agentPanel.selectProfile : undefined}
            onProviderChange={state == null ? agentPanel.selectProvider : undefined}
            onDeleteStoredAttachment={
              state == null
                ? (attachmentID) => void agentPanel.deleteStoredAttachmentReference(attachmentID)
                : undefined
            }
            onReuseRecentAttachment={state == null ? agentPanel.reuseStoredAttachmentReference : undefined}
            onRoleChange={state == null ? agentPanel.selectRole : undefined}
            onRemoveAttachment={state == null ? agentPanel.removeQueuedAttachmentReference : undefined}
            onSelectedContextWidgetIDsChange={
              state == null ? agentPanel.setSelectedContextWidgetIDs : undefined
            }
            onSubmit={state == null ? agentPanel.submitDraft : undefined}
            onValueChange={state == null ? agentPanel.setDraft : undefined}
            onWidgetContextEnabledChange={state == null ? agentPanel.setIsWidgetContextEnabled : undefined}
            placeholder={panelState.composerPlaceholder}
            recentAttachments={state == null ? agentPanel.recentAttachmentReferences : undefined}
            selectedContextWidgetIDs={state == null ? agentPanel.selectedContextWidgetIDs : undefined}
            selectedModeID={state == null ? agentPanel.selectedModeID : undefined}
            selectedModel={state == null ? agentPanel.selectedModel : undefined}
            selectedProfileID={state == null ? agentPanel.selectedProfileID : undefined}
            selectedProviderID={state == null ? agentPanel.selectedProviderID : undefined}
            selectedRoleID={state == null ? agentPanel.selectedRoleID : undefined}
            submitDisabled={
              state == null
                ? agentPanel.isSubmitting ||
                  agentPanel.isInteractionPending ||
                  agentPanel.isConversationPending ||
                  agentPanel.draft.trim() === ''
                : true
            }
            submitMode={submitMode}
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
