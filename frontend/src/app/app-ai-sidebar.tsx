import type { DockviewApi } from 'dockview-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useUnit } from 'effector-react'
import { startTransition, useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import {
  formatProviderGatewayErrorCode,
  getProviderGatewayRecoveryAction,
} from '@/features/agent/model/provider-gateway-actions'
import { useAgentPanel } from '@/features/agent/model/use-agent-panel'
import { $queuedAiPromptHandoff, consumeAiPromptHandoff } from '@/shared/model/ai-handoff'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Box, Button, Surface, Text } from '@/shared/ui/primitives'
import { AiPanelHeaderWidget, AiPanelWidget } from '@/widgets'
import { ensureAiTerminalVisibility } from '@/widgets/terminal/ensure-terminal-visibility'

import {
  aiPanelBodyStyle,
  aiPanelFrameStyle,
  aiPanelHeaderStyle,
  aiPanelShellContentStyle,
  aiPanelShellStyle,
  aiResizeHandleStyle,
} from './app-shell.styles'

const AI_PANEL_DEFAULT_RATIO = 0.3
const AI_PANEL_COLLAPSED_WIDTH = 112
const AI_PANEL_MIN_WIDTH = 320
const AI_PANEL_RESIZE_HANDLE_WIDTH = 6
const AI_PANEL_ANIMATION_SECONDS = 0.84
const AI_PANEL_ANIMATION_EASE = [0.22, 0.61, 0.36, 1] as const
const AI_SHELL_PANEL_HOST_ID = 'ai-shell-panel'
const AI_SHELL_PANEL_DISCLOSURE_REGION_ID = 'ai-shell-panel-disclosure-region'
const WORKSPACE_MIN_WIDTH = 420
const AI_PROVIDER_HISTORY_LIMIT = 3

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

function formatRouteTimestamp(value?: string) {
  const normalized = value?.trim() ?? ''
  if (!normalized) {
    return ''
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function formatDurationMilliseconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return ''
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}s`
  }

  return `${Math.trunc(value)}ms`
}

function formatProviderRunStatus(status: string) {
  switch (status.trim()) {
    case 'succeeded':
      return 'Succeeded'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status.trim() || 'Unknown'
  }
}

function formatProviderPrewarmPolicy(policy?: string) {
  switch ((policy ?? '').trim()) {
    case 'on_activate':
      return 'Warm on activate'
    case 'on_startup':
      return 'Warm on startup'
    case 'manual':
      return 'Manual warm'
    default:
      return ''
  }
}

type AiCollapsedSummaryProps = {
  activeConversationTitle: string
  conversationCountLabel: string
  disclosureRegionId: string
  onExpand: () => void
  providerLabel: string
  routeLabel: string
}

function AiCollapsedSummary({
  activeConversationTitle,
  conversationCountLabel,
  disclosureRegionId,
  onExpand,
  providerLabel,
  routeLabel,
}: AiCollapsedSummaryProps) {
  return (
    <Surface
      runaComponent="ai-shell-panel-collapsed-summary"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.7rem',
        padding: '0.7rem 0.5rem 0.8rem',
        background: 'var(--color-surface-glass-soft)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <Box style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', minWidth: 0 }}>
        <Button
          aria-label="Expand AI panel"
          aria-controls={disclosureRegionId}
          aria-expanded="false"
          onClick={onExpand}
          runaComponent="ai-shell-panel-expand-button"
          style={{ minHeight: '32px', width: '100%', paddingInline: '0.5rem' }}
        >
          Expand
        </Button>
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem', minWidth: 0 }}>
          <Text
            runaComponent="ai-shell-panel-collapsed-title"
            style={{
              fontSize: '0.67rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-dim)',
            }}
          >
            AI work panel
          </Text>
          <Text
            runaComponent="ai-shell-panel-collapsed-route"
            title={providerLabel}
            style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text)' }}
          >
            {providerLabel}
          </Text>
          <Text
            runaComponent="ai-shell-panel-collapsed-route-state"
            title={routeLabel}
            style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}
          >
            {routeLabel}
          </Text>
        </Box>
      </Box>
      <Box style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem', minWidth: 0 }}>
        <Text
          runaComponent="ai-shell-panel-collapsed-conversation-label"
          style={{
            fontSize: '0.67rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-dim)',
          }}
        >
          Active thread
        </Text>
        <Text
          runaComponent="ai-shell-panel-collapsed-conversation-title"
          title={activeConversationTitle}
          style={{ fontWeight: 600, fontSize: '0.79rem', color: 'var(--color-text)' }}
        >
          {activeConversationTitle}
        </Text>
        <Text
          runaComponent="ai-shell-panel-collapsed-conversation-meta"
          title={conversationCountLabel}
          style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}
        >
          {conversationCountLabel}
        </Text>
      </Box>
    </Surface>
  )
}

/** Renders the shell-managed AI sidebar, including resize behavior and open/close animation. */
export function AppAiSidebar({ dockviewApiRef, isOpen, contentAreaRef }: AppAiSidebarProps) {
  const [aiPanelWidth, setAiPanelWidth] = useState(getDefaultAiPanelWidth())
  const [isAiPanelExpanded, setIsAiPanelExpanded] = useState(false)
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
  const activeProviderRouteAction = getProviderGatewayRecoveryAction(agentPanel.activeProviderGateway)
  const [selectedHistoryRunID, setSelectedHistoryRunID] = useState('')

  useEffect(() => {
    aiResizeStartRef.current = null
    setIsAiPanelResizing(false)
    if (!isOpen) {
      startTransition(() => {
        setIsAiPanelExpanded(false)
      })
    }
  }, [isOpen])

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
    if (!isAiPanelExpanded || !isAiPanelResizing) {
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

  useEffect(() => {
    const fallbackRunID = agentPanel.activeProviderHistoryRuns[0]?.id ?? ''
    if (!fallbackRunID) {
      setSelectedHistoryRunID('')
      return
    }

    setSelectedHistoryRunID((currentRunID) =>
      currentRunID && agentPanel.activeProviderHistoryRuns.some((run) => run.id === currentRunID)
        ? currentRunID
        : fallbackRunID,
    )
  }, [agentPanel.activeProviderHistoryRuns])

  const selectedHistoryRun =
    agentPanel.activeProviderHistoryRuns.find((run) => run.id === selectedHistoryRunID) ??
    agentPanel.activeProviderHistoryRuns[0] ??
    null
  const routeMetaParts = [
    agentPanel.activeProviderGateway
      ? formatProviderPrewarmPolicy(agentPanel.activeProviderGateway.route_prewarm_policy)
      : '',
    agentPanel.activeProviderGateway?.route_warm_ttl_seconds
      ? `ttl ${agentPanel.activeProviderGateway.route_warm_ttl_seconds}s`
      : '',
    formatRouteTimestamp(agentPanel.activeProviderGateway?.route_prepare_expires_at)
      ? `warm until ${formatRouteTimestamp(agentPanel.activeProviderGateway?.route_prepare_expires_at)}`
      : '',
    agentPanel.activeProviderGateway?.route_prepare_stale ? 'stale warm state' : '',
  ].filter(Boolean)
  const selectedHistoryRunMeta = [
    selectedHistoryRun?.request_mode?.trim() || '',
    selectedHistoryRun?.model?.trim() || '',
    formatDurationMilliseconds(selectedHistoryRun?.duration_ms ?? 0),
    formatRouteTimestamp(selectedHistoryRun?.started_at),
  ].filter(Boolean)

  const handleToggleAiPanel = useCallback(() => {
    aiResizeStartRef.current = null
    setIsAiPanelResizing(false)
    startTransition(() => {
      setIsAiPanelExpanded((current) => !current)
    })
  }, [])

  const providerLabel = agentPanel.activeProviderGateway?.display_name?.trim() || 'No route'
  const routeLabel =
    agentPanel.providerGatewayError?.trim() ||
    agentPanel.activeProviderGateway?.route_prepare_state?.trim() ||
    agentPanel.activeProviderGateway?.route_status_state?.trim() ||
    'Unchecked'
  const activeConversationTitle = agentPanel.activeConversationSummary?.title?.trim() || 'New conversation'
  const activeConversationCount = agentPanel.activeConversationSummary?.message_count ?? 0
  const conversationCountLabel =
    activeConversationCount > 0 ? `${activeConversationCount} msgs` : 'No messages yet'
  const activeAiPanelWidth = isAiPanelExpanded ? aiPanelWidth : AI_PANEL_COLLAPSED_WIDTH
  const activeResizeHandleWidth = isAiPanelExpanded ? AI_PANEL_RESIZE_HANDLE_WIDTH : 0
  const aiShellWidth = activeAiPanelWidth + activeResizeHandleWidth
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
                style={{
                  ...aiPanelFrameStyle,
                  flex: `0 0 ${activeAiPanelWidth}px`,
                  width: `${activeAiPanelWidth}px`,
                }}
              >
                <Box
                  data-runa-shell-widget-frame=""
                  data-runa-shell-widget-kind="ai"
                  id={AI_SHELL_PANEL_DISCLOSURE_REGION_ID}
                  role="region"
                  aria-label="AI work panel"
                  runaComponent="ai-shell-panel-frame"
                  style={aiPanelFrameStyle}
                >
                  <Box
                    data-runa-shell-widget-header=""
                    runaComponent="ai-shell-panel-header"
                    style={{
                      ...aiPanelHeaderStyle,
                      gap: '0.4rem',
                      alignItems: 'stretch',
                    }}
                  >
                    {isAiPanelExpanded ? (
                      <>
                        <Button
                          aria-label="Collapse AI panel"
                          aria-controls={AI_SHELL_PANEL_DISCLOSURE_REGION_ID}
                          aria-expanded="true"
                          onClick={handleToggleAiPanel}
                          runaComponent="ai-shell-panel-collapse-button"
                          style={{
                            flex: '0 0 auto',
                            minHeight: '44px',
                            paddingInline: '0.72rem',
                            alignSelf: 'stretch',
                          }}
                        >
                          Collapse
                        </Button>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <AiPanelHeaderWidget
                            activeConversation={agentPanel.activeConversationSummary}
                            activeConversationID={agentPanel.activeConversationID}
                            activeProviderRoute={
                              agentPanel.activeProviderGateway
                                ? {
                                    displayName: agentPanel.activeProviderGateway.display_name,
                                    lastErrorCode: agentPanel.activeProviderGateway.last_error_code,
                                    model: agentPanel.activeProviderGateway.model,
                                    routeReady: agentPanel.activeProviderGateway.route_ready,
                                    routeStatusState: agentPanel.activeProviderGateway.route_status_state,
                                    routeStatusMessage: agentPanel.activeProviderGateway.route_status_message,
                                    routePrepared: agentPanel.activeProviderGateway.route_prepared,
                                    routePrepareState: agentPanel.activeProviderGateway.route_prepare_state,
                                    routePrepareMessage:
                                      agentPanel.activeProviderGateway.route_prepare_message,
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
                              agentPanel.isProviderGatewayPending ||
                              agentPanel.isProviderRoutePreparing ||
                              agentPanel.isProviderRouteProbing
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
                            onDeleteConversation={(conversationID) =>
                              agentPanel.deleteConversation(conversationID)
                            }
                            onProviderRouteAction={() =>
                              activeProviderRouteAction?.kind === 'probe'
                                ? agentPanel.probeActiveProviderRoute()
                                : agentPanel.prewarmActiveProviderRoute()
                            }
                            onRenameConversation={(conversationID, title) =>
                              agentPanel.renameConversation(conversationID, title)
                            }
                            onRestoreConversation={(conversationID) =>
                              agentPanel.restoreConversation(conversationID)
                            }
                            onModeChange={setChatMode}
                            providerRouteActionLabel={activeProviderRouteAction?.label ?? null}
                            providerRouteError={agentPanel.providerGatewayError}
                            title="AI Rune"
                          />
                        </Box>
                      </>
                    ) : (
                      <AiCollapsedSummary
                        activeConversationTitle={activeConversationTitle}
                        conversationCountLabel={conversationCountLabel}
                        disclosureRegionId={AI_SHELL_PANEL_DISCLOSURE_REGION_ID}
                        onExpand={handleToggleAiPanel}
                        providerLabel={providerLabel}
                        routeLabel={routeLabel}
                      />
                    )}
                  </Box>
                  {isAiPanelExpanded &&
                  (agentPanel.activeProviderGateway ||
                    agentPanel.providerGatewayError ||
                    agentPanel.activeProviderHistoryError) ? (
                    <Surface
                      runaComponent="ai-shell-provider-operator-panel"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        padding: '0.55rem 0.65rem',
                        background: 'var(--color-surface-glass-soft)',
                        borderColor: 'var(--color-border-muted)',
                      }}
                    >
                      <Box
                        runaComponent="ai-shell-provider-operator-summary"
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}
                      >
                        <Box
                          runaComponent="ai-shell-provider-operator-summary-top"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.45rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Box
                            style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}
                          >
                            <Text
                              runaComponent="ai-shell-provider-operator-label"
                              style={{
                                fontSize: '0.67rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'var(--color-text-dim)',
                              }}
                            >
                              Active route
                            </Text>
                            <Text
                              runaComponent="ai-shell-provider-operator-title"
                              style={{
                                fontWeight: 600,
                                fontSize: '0.86rem',
                                color: 'var(--color-text)',
                              }}
                            >
                              {agentPanel.activeProviderGateway
                                ? `${agentPanel.activeProviderGateway.display_name} · ${
                                    agentPanel.activeProviderGateway.route_prepare_state?.trim() ===
                                      'prepared' && agentPanel.activeProviderGateway.route_prepared
                                      ? 'Prepared'
                                      : agentPanel.activeProviderGateway.route_status_state?.trim() ||
                                        'Unchecked'
                                  }`
                                : 'Route telemetry unavailable'}
                            </Text>
                          </Box>
                          <Box style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {activeProviderRouteAction ? (
                              <Button
                                aria-label={activeProviderRouteAction.label}
                                disabled={
                                  agentPanel.isProviderGatewayPending ||
                                  agentPanel.isProviderRoutePreparing ||
                                  agentPanel.isProviderRouteProbing
                                }
                                onClick={() => {
                                  void (activeProviderRouteAction.kind === 'probe'
                                    ? agentPanel.probeActiveProviderRoute()
                                    : agentPanel.prewarmActiveProviderRoute())
                                }}
                                runaComponent="ai-shell-provider-operator-recovery"
                                style={{ minHeight: '30px', padding: '0.26rem 0.6rem', fontSize: '0.77rem' }}
                              >
                                {activeProviderRouteAction.label}
                              </Button>
                            ) : null}
                            <Button
                              aria-label="Clear route state"
                              disabled={
                                agentPanel.isProviderGatewayPending ||
                                agentPanel.isProviderRoutePreparing ||
                                agentPanel.isProviderRouteProbing
                              }
                              onClick={() => {
                                void agentPanel.clearActiveProviderRouteState()
                              }}
                              runaComponent="ai-shell-provider-operator-clear"
                              style={{ minHeight: '30px', padding: '0.26rem 0.6rem', fontSize: '0.77rem' }}
                            >
                              Clear route state
                            </Button>
                          </Box>
                        </Box>
                        {agentPanel.activeProviderGateway?.route_status_message?.trim() ? (
                          <Text
                            runaComponent="ai-shell-provider-operator-status"
                            style={{ color: 'var(--color-text-muted)', fontSize: '0.79rem' }}
                          >
                            {agentPanel.activeProviderGateway.route_status_message.trim()}
                          </Text>
                        ) : null}
                        {routeMetaParts.length > 0 ? (
                          <Text
                            runaComponent="ai-shell-provider-operator-meta"
                            style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}
                          >
                            {routeMetaParts.join(' · ')}
                          </Text>
                        ) : null}
                        {agentPanel.providerGatewayError ? (
                          <Text
                            runaComponent="ai-shell-provider-operator-error"
                            style={{ color: 'var(--color-danger-text)', fontSize: '0.76rem' }}
                          >
                            {agentPanel.providerGatewayError}
                          </Text>
                        ) : null}
                      </Box>
                      <Box
                        runaComponent="ai-shell-provider-operator-history"
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem', minWidth: 0 }}
                      >
                        <Box
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.45rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Text style={{ fontWeight: 600, fontSize: '0.8rem' }}>Recent route activity</Text>
                          <Text style={{ color: 'var(--color-text-dim)', fontSize: '0.73rem' }}>
                            {agentPanel.activeProviderHistoryTotal > AI_PROVIDER_HISTORY_LIMIT
                              ? `Showing ${Math.min(
                                  agentPanel.activeProviderHistoryRuns.length,
                                  AI_PROVIDER_HISTORY_LIMIT,
                                )} of ${agentPanel.activeProviderHistoryTotal}`
                              : `${agentPanel.activeProviderHistoryRuns.length} persisted runs`}
                          </Text>
                        </Box>
                        {agentPanel.activeProviderHistoryError ? (
                          <Text style={{ color: 'var(--color-danger-text)', fontSize: '0.76rem' }}>
                            {agentPanel.activeProviderHistoryError}
                          </Text>
                        ) : null}
                        {agentPanel.isActiveProviderHistoryPending ? (
                          <Text style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                            Loading recent route activity…
                          </Text>
                        ) : null}
                        {!agentPanel.isActiveProviderHistoryPending &&
                        agentPanel.activeProviderHistoryRuns.length > 0 ? (
                          <Box
                            runaComponent="ai-shell-provider-operator-history-layout"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                              gap: '0.45rem',
                              minWidth: 0,
                            }}
                          >
                            <Box
                              runaComponent="ai-shell-provider-operator-history-list"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                minWidth: 0,
                              }}
                            >
                              {agentPanel.activeProviderHistoryRuns.map((run) => {
                                const isSelected = run.id === selectedHistoryRun?.id

                                return (
                                  <button
                                    aria-label={`Open run diagnostics ${run.id}`}
                                    key={run.id}
                                    onClick={() => setSelectedHistoryRunID(run.id)}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.16rem',
                                      alignItems: 'flex-start',
                                      minWidth: 0,
                                      padding: '0.4rem 0.48rem',
                                      borderRadius: 'var(--radius-sm)',
                                      border: isSelected
                                        ? '1px solid var(--color-border-strong)'
                                        : '1px solid var(--color-border-subtle)',
                                      background: isSelected
                                        ? 'var(--color-surface-glass-strong)'
                                        : 'var(--color-surface-glass-soft)',
                                      color: 'var(--color-text)',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                    type="button"
                                  >
                                    <Text style={{ fontWeight: 600, fontSize: '0.77rem' }}>
                                      {formatProviderRunStatus(run.status)}
                                      {run.error_code?.trim()
                                        ? ` · ${formatProviderGatewayErrorCode(run.error_code) || run.error_code}`
                                        : ''}
                                    </Text>
                                    <Text
                                      style={{
                                        color: 'var(--color-text-dim)',
                                        fontSize: '0.72rem',
                                        minWidth: 0,
                                      }}
                                    >
                                      {[
                                        run.request_mode.trim() || '',
                                        run.model?.trim() || '',
                                        formatDurationMilliseconds(run.duration_ms),
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </Text>
                                  </button>
                                )
                              })}
                            </Box>
                            {selectedHistoryRun ? (
                              <Surface
                                runaComponent="ai-shell-provider-operator-history-details"
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.3rem',
                                  minWidth: 0,
                                  padding: '0.48rem 0.54rem',
                                  background: 'var(--color-canvas)',
                                }}
                              >
                                <Text style={{ fontWeight: 600, fontSize: '0.78rem' }}>
                                  {selectedHistoryRun.provider_display_name}
                                </Text>
                                <Text style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>
                                  {selectedHistoryRunMeta.join(' · ')}
                                </Text>
                                <Text style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                  Route:{' '}
                                  {[
                                    selectedHistoryRun.route_status_state?.trim() || '',
                                    selectedHistoryRun.route_prepare_state?.trim() || '',
                                  ]
                                    .filter(Boolean)
                                    .join(' / ') || 'unknown'}
                                </Text>
                                {selectedHistoryRun.error_message?.trim() ? (
                                  <Text style={{ color: 'var(--color-danger-text)', fontSize: '0.75rem' }}>
                                    {selectedHistoryRun.error_message.trim()}
                                  </Text>
                                ) : null}
                                {selectedHistoryRun.actor_username?.trim() ? (
                                  <Text style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>
                                    Actor: {selectedHistoryRun.actor_username.trim()}
                                  </Text>
                                ) : null}
                                {selectedHistoryRun.resolved_binary?.trim() ||
                                selectedHistoryRun.base_url?.trim() ? (
                                  <Text style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>
                                    Resolved route:{' '}
                                    {selectedHistoryRun.resolved_binary?.trim() ||
                                      selectedHistoryRun.base_url?.trim()}
                                  </Text>
                                ) : null}
                              </Surface>
                            ) : null}
                          </Box>
                        ) : null}
                        {!agentPanel.isActiveProviderHistoryPending &&
                        agentPanel.activeProviderHistoryRuns.length === 0 &&
                        !agentPanel.activeProviderHistoryError ? (
                          <Text style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                            No persisted route activity for the active provider yet.
                          </Text>
                        ) : null}
                      </Box>
                    </Surface>
                  ) : null}
                  {isAiPanelExpanded ? (
                    <Box runaComponent="ai-shell-panel-body" style={aiPanelBodyStyle}>
                      <AiPanelWidget
                        controller={agentPanel}
                        hostId={AI_SHELL_PANEL_HOST_ID}
                        mode={chatMode}
                      />
                    </Box>
                  ) : null}
                </Box>
              </Box>
              {isAiPanelExpanded ? (
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
              ) : null}
            </Box>
          </RunaDomScopeProvider>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
