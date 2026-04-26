import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import {
  Archive,
  Check,
  ChevronDown,
  LoaderCircle,
  MessageSquareMore,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import runaAvatar from '@assets/img/logo.png'
import type {
  AgentConversationListCounts,
  AgentConversationListScope,
  AgentConversationSummary,
} from '@/features/agent/api/client'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Avatar } from '@/shared/ui/components'
import { Box, Button, Input, Surface, Text } from '@/shared/ui/primitives'

import {
  aiHeaderConversationActionStyle,
  aiHeaderConversationCurrentBadgeStyle,
  aiHeaderConversationCurrentBlockStyle,
  aiHeaderConversationCurrentHeaderStyle,
  aiHeaderConversationDropdownHeaderStyle,
  aiHeaderConversationDropdownHeaderTopStyle,
  aiHeaderConversationDropdownActionsStyle,
  aiHeaderConversationDropdownStyle,
  aiHeaderConversationDropdownWrapStyle,
  aiHeaderConversationEmptyStateStyle,
  aiHeaderConversationGroupStyle,
  aiHeaderConversationLabelStyle,
  aiHeaderConversationMenuListStyle,
  aiHeaderConversationMenuMetaStyle,
  aiHeaderConversationMenuOptionActiveStyle,
  aiHeaderConversationMenuOptionHighlightedStyle,
  aiHeaderConversationMenuOptionLeadingStyle,
  aiHeaderConversationMenuOptionSelectStyle,
  aiHeaderConversationMenuRowActionStyle,
  aiHeaderConversationMenuRowActionsStyle,
  aiHeaderConversationMenuRowStyle,
  aiHeaderConversationMenuOptionStyle,
  aiHeaderConversationMenuSectionStyle,
  aiHeaderConversationMenuSectionTitleStyle,
  aiHeaderConversationMenuSummaryStyle,
  aiHeaderConversationRenameActionsStyle,
  aiHeaderConversationRenameInputStyle,
  aiHeaderConversationRenamePanelStyle,
  aiHeaderConversationSearchInputStyle,
  aiHeaderConversationScopeButtonActiveStyle,
  aiHeaderConversationScopeButtonStyle,
  aiHeaderConversationScopeStripStyle,
  aiHeaderConversationSearchWrapStyle,
  aiHeaderConversationSummaryMetaStyle,
  aiHeaderConversationSummaryStyle,
  aiHeaderConversationSummaryTitleStyle,
  aiHeaderConversationTriggerLeadingStyle,
  aiHeaderConversationTriggerStyle,
  aiHeaderModeButtonActiveStyle,
  aiHeaderModeButtonStyle,
  aiHeaderModeGroupStyle,
  aiShellHeaderStyle,
  aiShellHeaderLogoSlotStyle,
  aiShellRouteActionStyle,
  aiShellRouteClusterStyle,
  aiShellRouteMetaStyle,
  aiShellRouteSummaryStyle,
  aiShellRouteTitleStyle,
  aiShellHeaderTitleLaneStyle,
  aiShellTitleClusterStyle,
  aiShellTitleTextStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  activeProviderRoute?: {
    displayName: string
    model?: string
    routeReady: boolean
    routeStatusState?: string
    routeStatusMessage?: string
    routePrepared: boolean
    routePrepareState?: string
    routePrepareMessage?: string
    routeLatencyMS: number
    routePrepareLatencyMS: number
    lastFirstResponseLatencyMS: number
  } | null
  activeConversation?: AgentConversationSummary | null
  activeConversationID?: string
  conversationCounts?: AgentConversationListCounts
  conversationScope?: AgentConversationListScope
  conversationSearchQuery?: string
  conversations?: AgentConversationSummary[]
  isConversationBusy?: boolean
  isProviderRouteBusy?: boolean
  mode: ChatMode
  onConversationScopeChange?: (scope: AgentConversationListScope) => void
  onConversationSearchQueryChange?: (value: string) => void
  onConversationSelect?: (conversationID: string) => void
  onCreateConversation?: () => void
  onArchiveConversation?: (conversationID: string) => Promise<void> | void
  onDeleteConversation?: (conversationID: string) => Promise<void> | void
  onPrewarmProviderRoute?: () => Promise<void> | void
  onRenameConversation?: (conversationID: string, title: string) => Promise<void> | void
  onRestoreConversation?: (conversationID: string) => Promise<void> | void
  onModeChange: (mode: ChatMode) => void
  providerRouteError?: string | null
  title: string
}

const CHAT_MODES: ChatMode[] = ['chat', 'dev', 'debug']
const CONVERSATION_SCOPES = ['recent', 'archived', 'all'] as const
const defaultConversationCounts: AgentConversationListCounts = {
  recent: 0,
  archived: 0,
  all: 0,
}
const conversationActionIconProps = {
  size: 14,
  strokeWidth: 1.75,
}

function formatConversationTitle(conversation: AgentConversationSummary) {
  return conversation.title.trim() || 'New conversation'
}

function formatConversationCount(conversation: AgentConversationSummary) {
  const suffix = conversation.message_count === 1 ? '1 msg' : `${conversation.message_count} msgs`
  return suffix
}

function isArchivedConversation(conversation: AgentConversationSummary | null) {
  return Boolean(conversation?.archived_at?.trim())
}

function formatConversationUpdatedAt(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown activity'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function conversationScopeLabel(scope: AgentConversationListScope, count: number) {
  const suffix = count === 1 ? '1' : String(count)

  switch (scope) {
    case 'recent':
      return `Open ${suffix}`
    case 'archived':
      return `Archived ${suffix}`
    case 'all':
      return `All ${suffix}`
  }
}

function conversationSectionTitle(scope: AgentConversationListScope, archived: boolean) {
  if (scope === 'all') {
    return archived ? 'Archived' : 'Recent'
  }

  return archived ? 'Archived threads' : 'Open threads'
}

function buildConversationTitleCounts(conversations: AgentConversationSummary[]) {
  return conversations.reduce<Map<string, number>>((counts, conversation) => {
    const title = formatConversationTitle(conversation)
    counts.set(title, (counts.get(title) ?? 0) + 1)
    return counts
  }, new Map())
}

function conversationOptionAriaLabel(
  conversation: AgentConversationSummary,
  titleCounts: Map<string, number>,
) {
  const title = formatConversationTitle(conversation)
  if ((titleCounts.get(title) ?? 0) <= 1) {
    return `Open conversation ${title}`
  }

  return `Open conversation ${title} · ${formatConversationCount(conversation)} · ${formatConversationUpdatedAt(
    conversation.archived_at ?? conversation.updated_at,
  )}`
}

function formatProviderRouteStateLabel(route: NonNullable<AiPanelHeaderWidgetProps['activeProviderRoute']>) {
  if (route.routePrepareState?.trim() === 'prepared' && route.routePrepared) {
    return 'Prepared'
  }
  if (route.routeStatusState?.trim() === 'ready' && route.routeReady) {
    return 'Ready'
  }
  if (route.routePrepareState?.trim()) {
    return route.routePrepareState.trim()
  }
  if (route.routeStatusState?.trim()) {
    return route.routeStatusState.trim()
  }
  return 'Unchecked'
}

function formatProviderRouteMeta(route: NonNullable<AiPanelHeaderWidgetProps['activeProviderRoute']>) {
  const segments: string[] = []
  if (route.model?.trim()) {
    segments.push(route.model.trim())
  }
  if (route.lastFirstResponseLatencyMS > 0) {
    segments.push(`first ${route.lastFirstResponseLatencyMS}ms`)
  } else if (route.routePrepareLatencyMS > 0) {
    segments.push(`prepare ${route.routePrepareLatencyMS}ms`)
  } else if (route.routeLatencyMS > 0) {
    segments.push(`probe ${route.routeLatencyMS}ms`)
  }
  return segments.join(' · ')
}

export function AiPanelHeaderWidget({
  activeProviderRoute = null,
  activeConversation: activeConversationOverride = null,
  activeConversationID = '',
  conversationCounts = defaultConversationCounts,
  conversationScope: controlledConversationScope,
  conversationSearchQuery: controlledConversationSearchQuery,
  conversations = [],
  isConversationBusy = false,
  isProviderRouteBusy = false,
  mode,
  onConversationScopeChange,
  onConversationSearchQueryChange,
  onConversationSelect,
  onCreateConversation,
  onArchiveConversation,
  onDeleteConversation,
  onPrewarmProviderRoute,
  onRenameConversation,
  onRestoreConversation,
  onModeChange,
  providerRouteError = null,
  title,
}: AiPanelHeaderWidgetProps) {
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false)
  const [isRenamingConversation, setIsRenamingConversation] = useState(false)
  const [isDeleteConversationConfirmOpen, setIsDeleteConversationConfirmOpen] = useState(false)
  const [pendingDeleteConversationID, setPendingDeleteConversationID] = useState('')
  const [localConversationSearchQuery, setLocalConversationSearchQuery] = useState('')
  const [localConversationScope, setLocalConversationScope] = useState<AgentConversationListScope>('recent')
  const [renameDraft, setRenameDraft] = useState('')
  const [optimisticConversationTitle, setOptimisticConversationTitle] = useState('')
  const [highlightedConversationID, setHighlightedConversationID] = useState('')
  const conversationMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const conversationOptionRefs = useRef(new Map<string, HTMLButtonElement>())
  const isConversationSearchControlled =
    controlledConversationSearchQuery != null && onConversationSearchQueryChange != null
  const isConversationScopeControlled =
    controlledConversationScope != null && onConversationScopeChange != null
  const conversationSearchQuery = isConversationSearchControlled
    ? (controlledConversationSearchQuery ?? '')
    : localConversationSearchQuery
  const conversationScope = isConversationScopeControlled
    ? (controlledConversationScope ?? 'recent')
    : localConversationScope
  const hasConversationOptions = conversations.length > 0
  const selectedConversationID = activeConversationID || conversations[0]?.id || ''
  const activeConversation = useMemo(
    () =>
      activeConversationOverride ??
      conversations.find((conversation) => conversation.id === selectedConversationID) ??
      null,
    [activeConversationOverride, conversations, selectedConversationID],
  )
  const canOpenConversationMenu = hasConversationOptions || activeConversation != null
  const activeConversationTitle = activeConversation
    ? formatConversationTitle(activeConversation)
    : 'Loading conversations'
  const displayedConversationTitle = optimisticConversationTitle.trim() || activeConversationTitle
  const activeConversationMeta = activeConversation
    ? isArchivedConversation(activeConversation)
      ? `${formatConversationCount(activeConversation)} · Archived ${formatConversationUpdatedAt(activeConversation.archived_at ?? activeConversation.updated_at)}`
      : `${formatConversationCount(activeConversation)} · ${formatConversationUpdatedAt(activeConversation.updated_at)}`
    : 'Recent thread list'
  const activeConversationBadgeLabel = activeConversation
    ? isArchivedConversation(activeConversation)
      ? 'Archived'
      : 'Open'
    : ''
  const canRenameConversation = activeConversation != null && onRenameConversation != null
  const canArchiveConversation =
    activeConversation != null && onArchiveConversation != null && !isArchivedConversation(activeConversation)
  const canRestoreConversation =
    activeConversation != null && onRestoreConversation != null && isArchivedConversation(activeConversation)
  const canDeleteConversation = activeConversation != null && onDeleteConversation != null
  const hasConversationSearchQuery = conversationSearchQuery.trim() !== ''
  const normalizedConversationSearchQuery = conversationSearchQuery.trim().toLowerCase()
  const filteredConversations = useMemo(() => {
    if (isConversationSearchControlled) {
      return conversations
    }
    if (normalizedConversationSearchQuery === '') {
      return conversations
    }

    return conversations.filter((conversation) =>
      formatConversationTitle(conversation).toLowerCase().includes(normalizedConversationSearchQuery),
    )
  }, [conversations, isConversationSearchControlled, normalizedConversationSearchQuery])
  const filteredRecentConversations = useMemo(
    () => filteredConversations.filter((conversation) => !isArchivedConversation(conversation)),
    [filteredConversations],
  )
  const filteredArchivedConversations = useMemo(
    () => filteredConversations.filter((conversation) => isArchivedConversation(conversation)),
    [filteredConversations],
  )
  const effectiveConversationCounts =
    isConversationSearchControlled || isConversationScopeControlled
      ? conversationCounts
      : {
          recent: filteredRecentConversations.length,
          archived: filteredArchivedConversations.length,
          all: filteredConversations.length,
        }
  const visibleConversations = useMemo(() => {
    switch (conversationScope) {
      case 'recent':
        return filteredRecentConversations
      case 'archived':
        return filteredArchivedConversations
      case 'all':
        return filteredConversations
    }
  }, [conversationScope, filteredArchivedConversations, filteredConversations, filteredRecentConversations])
  const orderedConversationOptions = useMemo(() => {
    const nextOptions: AgentConversationSummary[] = []

    if (conversationScope !== 'archived') {
      nextOptions.push(...filteredRecentConversations)
    }

    if (conversationScope !== 'recent') {
      nextOptions.push(...filteredArchivedConversations)
    }

    return nextOptions
  }, [conversationScope, filteredArchivedConversations, filteredRecentConversations])
  const highlightedConversationIndex = highlightedConversationID
    ? orderedConversationOptions.findIndex((conversation) => conversation.id === highlightedConversationID)
    : -1
  const conversationTitleCounts = useMemo(
    () => buildConversationTitleCounts(orderedConversationOptions),
    [orderedConversationOptions],
  )
  const activeProviderRouteStateLabel = activeProviderRoute
    ? formatProviderRouteStateLabel(activeProviderRoute)
    : ''
  const activeProviderRouteMeta = activeProviderRoute ? formatProviderRouteMeta(activeProviderRoute) : ''
  const activeProviderRouteMessage =
    activeProviderRoute?.routePrepareMessage?.trim() ||
    activeProviderRoute?.routeStatusMessage?.trim() ||
    providerRouteError?.trim() ||
    ''

  useEffect(() => {
    if (!isConversationMenuOpen) {
      setIsRenamingConversation(false)
      setIsDeleteConversationConfirmOpen(false)
      setPendingDeleteConversationID('')
      setHighlightedConversationID('')
      return
    }

    setRenameDraft(activeConversation?.title ?? '')
  }, [activeConversation?.id, activeConversation?.title, isConversationMenuOpen])

  useEffect(() => {
    if (!optimisticConversationTitle.trim()) {
      return
    }

    if (
      !activeConversation ||
      formatConversationTitle(activeConversation) === optimisticConversationTitle.trim()
    ) {
      setOptimisticConversationTitle('')
    }
  }, [activeConversation, optimisticConversationTitle])

  useEffect(() => {
    if (!isConversationMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!conversationMenuWrapRef.current?.contains(event.target as Node)) {
        setIsConversationMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsConversationMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isConversationMenuOpen])

  useEffect(() => {
    if (!isConversationMenuOpen) {
      return
    }

    if (orderedConversationOptions.length === 0) {
      setHighlightedConversationID('')
      return
    }

    const highlightedStillVisible = orderedConversationOptions.some(
      (conversation) => conversation.id === highlightedConversationID,
    )

    if (highlightedStillVisible) {
      return
    }

    setHighlightedConversationID(orderedConversationOptions[0].id)
  }, [highlightedConversationID, isConversationMenuOpen, orderedConversationOptions])

  const highlightConversationOption = (index: number) => {
    if (orderedConversationOptions.length === 0) {
      return
    }

    const boundedIndex = Math.max(0, Math.min(index, orderedConversationOptions.length - 1))
    setHighlightedConversationID(orderedConversationOptions[boundedIndex].id)
  }

  const focusConversationButton = (index: number) => {
    if (orderedConversationOptions.length === 0) {
      return
    }

    const boundedIndex = Math.max(0, Math.min(index, orderedConversationOptions.length - 1))
    const nextConversation = orderedConversationOptions[boundedIndex]
    setHighlightedConversationID(nextConversation.id)
    conversationOptionRefs.current.get(nextConversation.id)?.focus()
  }

  const selectConversationFromNavigator = (conversationID: string) => {
    if (isConversationBusy) {
      return
    }
    setIsConversationMenuOpen(false)
    onConversationSelect?.(conversationID)
  }

  const selectHighlightedConversation = () => {
    if (!highlightedConversationID) {
      return
    }

    selectConversationFromNavigator(highlightedConversationID)
  }

  const handleConversationTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!hasConversationOptions) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isConversationMenuOpen) {
        setIsConversationMenuOpen(true)
        highlightConversationOption(0)
        return
      }
      highlightConversationOption(0)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isConversationMenuOpen) {
        setIsConversationMenuOpen(true)
        highlightConversationOption(orderedConversationOptions.length - 1)
        return
      }
      highlightConversationOption(orderedConversationOptions.length - 1)
    }
  }

  const handleConversationSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (orderedConversationOptions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      highlightConversationOption(highlightedConversationIndex >= 0 ? highlightedConversationIndex + 1 : 0)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      highlightConversationOption(
        highlightedConversationIndex >= 0
          ? highlightedConversationIndex - 1
          : orderedConversationOptions.length - 1,
      )
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      highlightConversationOption(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      highlightConversationOption(orderedConversationOptions.length - 1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      selectHighlightedConversation()
    }
  }

  const handleConversationOptionKeyDown =
    (index: number) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (orderedConversationOptions.length === 0) {
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const nextConversationID = orderedConversationOptions[index]?.id
        if (nextConversationID) {
          selectConversationFromNavigator(nextConversationID)
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        focusConversationButton(index + 1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        focusConversationButton(index - 1)
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        focusConversationButton(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        focusConversationButton(orderedConversationOptions.length - 1)
      }
    }

  const handleRenameConversation = async () => {
    const nextTitle = renameDraft.trim()

    if (!activeConversation || onRenameConversation == null || nextTitle === '') {
      return
    }

    setOptimisticConversationTitle(nextTitle)
    setIsRenamingConversation(false)
    setIsConversationMenuOpen(false)
    await onRenameConversation(activeConversation.id, nextTitle)
  }

  const handleDeleteConversation = async () => {
    const targetConversationID = pendingDeleteConversationID.trim() || activeConversation?.id || ''
    if (!targetConversationID || onDeleteConversation == null) {
      return
    }

    setIsDeleteConversationConfirmOpen(false)
    setPendingDeleteConversationID('')
    setIsConversationMenuOpen(false)
    await onDeleteConversation(targetConversationID)
  }

  const handleArchiveConversation = async (conversationID?: string) => {
    const targetConversationID = conversationID?.trim() || activeConversation?.id || ''
    if (!targetConversationID || onArchiveConversation == null) {
      return
    }

    setIsDeleteConversationConfirmOpen(false)
    setPendingDeleteConversationID('')
    setIsRenamingConversation(false)
    setIsConversationMenuOpen(false)
    await onArchiveConversation(targetConversationID)
  }

  const handleRestoreConversation = async (conversationID?: string) => {
    const targetConversationID = conversationID?.trim() || activeConversation?.id || ''
    if (!targetConversationID || onRestoreConversation == null) {
      return
    }

    setIsDeleteConversationConfirmOpen(false)
    setPendingDeleteConversationID('')
    setIsRenamingConversation(false)
    setIsConversationMenuOpen(false)
    await onRestoreConversation(targetConversationID)
  }

  const pendingDeleteConversation =
    conversations.find((conversation) => conversation.id === pendingDeleteConversationID) ??
    activeConversation

  const openDeleteConversationConfirm = (conversationID: string) => {
    setIsRenamingConversation(false)
    setPendingDeleteConversationID(conversationID)
    setIsDeleteConversationConfirmOpen(true)
  }

  return (
    <RunaDomScopeProvider component="ai-panel-header-widget">
      <Surface data-runa-ai-shell-header="" runaComponent="ai-panel-header-root" style={aiShellHeaderStyle}>
        <Box runaComponent="ai-panel-header-title-lane" style={aiShellHeaderTitleLaneStyle}>
          <Box
            aria-hidden="true"
            data-runa-ai-logo-slot=""
            runaComponent="ai-panel-header-logo-slot"
            style={aiShellHeaderLogoSlotStyle}
          >
            <Avatar label="Runa avatar" runaComponent="ai-panel-header-avatar" size={32} src={runaAvatar} />
          </Box>
          <Box runaComponent="ai-panel-header-title-cluster" style={aiShellTitleClusterStyle}>
            <Text runaComponent="ai-panel-header-title" style={aiShellTitleTextStyle}>
              {title} Assistant
            </Text>
          </Box>
          {activeProviderRoute ? (
            <Box runaComponent="ai-panel-header-route-cluster" style={aiShellRouteClusterStyle}>
              <Box runaComponent="ai-panel-header-route-summary" style={aiShellRouteSummaryStyle}>
                <Text
                  runaComponent="ai-panel-header-route-title"
                  style={aiShellRouteTitleStyle}
                  title={activeProviderRouteMessage || activeProviderRoute.displayName}
                >
                  {activeProviderRoute.displayName} · {activeProviderRouteStateLabel}
                </Text>
                <Text
                  runaComponent="ai-panel-header-route-meta"
                  style={aiShellRouteMetaStyle}
                  title={activeProviderRouteMessage || activeProviderRouteMeta}
                >
                  {activeProviderRouteMessage || activeProviderRouteMeta || 'No route telemetry yet'}
                </Text>
              </Box>
              <Button
                aria-label={
                  activeProviderRoute.routePrepared ? 'Re-prepare provider route' : 'Prepare provider route'
                }
                disabled={isProviderRouteBusy || onPrewarmProviderRoute == null}
                onClick={() => {
                  void onPrewarmProviderRoute?.()
                }}
                runaComponent="ai-panel-header-route-action"
                style={aiShellRouteActionStyle}
              >
                {isProviderRouteBusy ? (
                  <LoaderCircle aria-hidden="true" size={12} />
                ) : (
                  <Check aria-hidden="true" size={12} />
                )}
                {activeProviderRoute.routePrepared ? 'Refresh' : 'Prepare'}
              </Button>
            </Box>
          ) : null}
          <Box
            ref={conversationMenuWrapRef}
            runaComponent="ai-panel-header-conversation-group"
            style={aiHeaderConversationGroupStyle}
          >
            <Text runaComponent="ai-panel-header-conversation-label" style={aiHeaderConversationLabelStyle}>
              Conversation
            </Text>
            <Button
              aria-expanded={isConversationMenuOpen}
              aria-haspopup="dialog"
              aria-label="Conversation menu"
              disabled={isConversationBusy || !canOpenConversationMenu}
              onClick={() => setIsConversationMenuOpen((currentValue) => !currentValue)}
              onKeyDown={handleConversationTriggerKeyDown}
              runaComponent="ai-panel-header-conversation-trigger"
              style={aiHeaderConversationTriggerStyle}
              title={displayedConversationTitle}
            >
              <Box
                runaComponent="ai-panel-header-conversation-trigger-leading"
                style={aiHeaderConversationTriggerLeadingStyle}
              >
                <MessageSquareMore {...conversationActionIconProps} />
                <Box
                  runaComponent="ai-panel-header-conversation-summary"
                  style={aiHeaderConversationSummaryStyle}
                >
                  <Text style={aiHeaderConversationSummaryTitleStyle}>{displayedConversationTitle}</Text>
                  <Text style={aiHeaderConversationSummaryMetaStyle}>{activeConversationMeta}</Text>
                </Box>
              </Box>
              <ChevronDown {...conversationActionIconProps} />
            </Button>
            {isConversationMenuOpen ? (
              <Box
                runaComponent="ai-panel-header-conversation-dropdown-wrap"
                style={aiHeaderConversationDropdownWrapStyle}
              >
                <Surface
                  role="dialog"
                  aria-label="Conversation navigator"
                  runaComponent="ai-panel-header-conversation-dropdown"
                  style={aiHeaderConversationDropdownStyle}
                >
                  <Box
                    runaComponent="ai-panel-header-conversation-dropdown-header"
                    style={aiHeaderConversationDropdownHeaderStyle}
                  >
                    <Box
                      runaComponent="ai-panel-header-conversation-dropdown-header-top"
                      style={aiHeaderConversationDropdownHeaderTopStyle}
                    >
                      <Box
                        runaComponent="ai-panel-header-conversation-dropdown-summary"
                        style={aiHeaderConversationMenuSummaryStyle}
                      >
                        <Text style={aiHeaderConversationSummaryTitleStyle}>Conversations</Text>
                        <Text style={aiHeaderConversationMenuMetaStyle}>
                          {conversations.length === 1 ? '1 thread' : `${conversations.length} threads`}
                          {hasConversationSearchQuery ? ` · ${filteredConversations.length} shown` : ''}
                        </Text>
                      </Box>
                      <Box
                        runaComponent="ai-panel-header-conversation-dropdown-actions"
                        style={aiHeaderConversationDropdownActionsStyle}
                      >
                        <Button
                          aria-label="Rename conversation"
                          disabled={isConversationBusy || !canRenameConversation}
                          onClick={() => {
                            setIsDeleteConversationConfirmOpen(false)
                            setIsRenamingConversation(true)
                          }}
                          runaComponent="ai-panel-header-conversation-rename"
                          style={aiHeaderConversationActionStyle}
                        >
                          <Pencil {...conversationActionIconProps} />
                          Rename
                        </Button>
                        <Button
                          aria-label={
                            canRestoreConversation ? 'Restore conversation' : 'Archive conversation'
                          }
                          disabled={
                            isConversationBusy || (!canArchiveConversation && !canRestoreConversation)
                          }
                          onClick={() => {
                            if (canRestoreConversation) {
                              void handleRestoreConversation()
                              return
                            }
                            void handleArchiveConversation()
                          }}
                          runaComponent="ai-panel-header-conversation-archive"
                          style={aiHeaderConversationActionStyle}
                        >
                          {canRestoreConversation ? (
                            <RotateCcw {...conversationActionIconProps} />
                          ) : (
                            <Archive {...conversationActionIconProps} />
                          )}
                          {canRestoreConversation ? 'Restore' : 'Archive'}
                        </Button>
                        <Button
                          aria-label="Delete conversation"
                          disabled={isConversationBusy || !canDeleteConversation}
                          onClick={() => {
                            if (!activeConversation) {
                              return
                            }
                            openDeleteConversationConfirm(activeConversation.id)
                          }}
                          runaComponent="ai-panel-header-conversation-delete"
                          style={aiHeaderConversationActionStyle}
                        >
                          <Trash2 {...conversationActionIconProps} />
                          Delete
                        </Button>
                        <Button
                          aria-label="Create conversation"
                          disabled={isConversationBusy || onCreateConversation == null}
                          onClick={() => {
                            setIsConversationMenuOpen(false)
                            onCreateConversation?.()
                          }}
                          runaComponent="ai-panel-header-conversation-create"
                          style={aiHeaderConversationActionStyle}
                        >
                          <Plus {...conversationActionIconProps} />
                          New
                        </Button>
                      </Box>
                    </Box>
                    <Box
                      runaComponent="ai-panel-header-conversation-search-wrap"
                      style={aiHeaderConversationSearchWrapStyle}
                    >
                      {activeConversation ? (
                        <Box
                          aria-label="Active conversation summary"
                          runaComponent="ai-panel-header-conversation-current-block"
                          style={aiHeaderConversationCurrentBlockStyle}
                        >
                          <Box
                            runaComponent="ai-panel-header-conversation-current-header"
                            style={aiHeaderConversationCurrentHeaderStyle}
                          >
                            <Text style={aiHeaderConversationMenuSectionTitleStyle}>Active thread</Text>
                            <Text style={aiHeaderConversationCurrentBadgeStyle}>
                              {activeConversationBadgeLabel}
                            </Text>
                          </Box>
                          <Box style={aiHeaderConversationMenuOptionLeadingStyle}>
                            <Text style={aiHeaderConversationSummaryTitleStyle}>
                              {displayedConversationTitle}
                            </Text>
                            <Text style={aiHeaderConversationMenuMetaStyle}>{activeConversationMeta}</Text>
                          </Box>
                        </Box>
                      ) : null}
                      <Box
                        runaComponent="ai-panel-header-conversation-scope-strip"
                        style={aiHeaderConversationScopeStripStyle}
                      >
                        {CONVERSATION_SCOPES.map((scope) => {
                          const count =
                            scope === 'recent'
                              ? effectiveConversationCounts.recent
                              : scope === 'archived'
                                ? effectiveConversationCounts.archived
                                : effectiveConversationCounts.all

                          return (
                            <Button
                              aria-label={`Show ${scope} conversations`}
                              aria-pressed={conversationScope === scope}
                              key={scope}
                              onClick={() => {
                                if (isConversationScopeControlled) {
                                  onConversationScopeChange?.(scope)
                                  return
                                }
                                setLocalConversationScope(scope)
                              }}
                              runaComponent={`ai-panel-header-conversation-scope-${scope}`}
                              style={{
                                ...aiHeaderConversationScopeButtonStyle,
                                ...(conversationScope === scope
                                  ? aiHeaderConversationScopeButtonActiveStyle
                                  : null),
                              }}
                            >
                              {conversationScopeLabel(scope, count)}
                            </Button>
                          )
                        })}
                      </Box>
                      <Input
                        aria-activedescendant={
                          highlightedConversationID
                            ? `ai-panel-header-conversation-option-${highlightedConversationID}`
                            : undefined
                        }
                        aria-label="Search conversations"
                        aria-controls="ai-panel-header-conversation-listbox"
                        disabled={isConversationBusy || conversations.length === 0}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value
                          if (isConversationSearchControlled) {
                            onConversationSearchQueryChange?.(nextValue)
                            return
                          }
                          setLocalConversationSearchQuery(nextValue)
                        }}
                        onKeyDown={handleConversationSearchKeyDown}
                        placeholder="Search conversations"
                        runaComponent="ai-panel-header-conversation-search-input"
                        style={aiHeaderConversationSearchInputStyle}
                        value={conversationSearchQuery}
                      />
                    </Box>
                  </Box>
                  {isDeleteConversationConfirmOpen && pendingDeleteConversation ? (
                    <Box
                      runaComponent="ai-panel-header-conversation-delete-panel"
                      style={aiHeaderConversationRenamePanelStyle}
                    >
                      <Text style={aiHeaderConversationMenuMetaStyle}>Delete conversation</Text>
                      <Text style={aiHeaderConversationSummaryTitleStyle}>
                        {formatConversationTitle(pendingDeleteConversation)}
                      </Text>
                      <Text style={aiHeaderConversationMenuMetaStyle}>
                        This removes the thread from the database and switches the panel to the next available
                        conversation.
                      </Text>
                      <Box
                        runaComponent="ai-panel-header-conversation-delete-actions"
                        style={aiHeaderConversationRenameActionsStyle}
                      >
                        <Button
                          aria-label="Cancel delete"
                          disabled={isConversationBusy}
                          onClick={() => setIsDeleteConversationConfirmOpen(false)}
                          runaComponent="ai-panel-header-conversation-delete-cancel"
                          style={aiHeaderConversationActionStyle}
                        >
                          <X {...conversationActionIconProps} />
                          Cancel
                        </Button>
                        <Button
                          aria-label="Confirm delete conversation"
                          disabled={isConversationBusy}
                          onClick={() => void handleDeleteConversation()}
                          runaComponent="ai-panel-header-conversation-delete-confirm"
                          style={aiHeaderConversationActionStyle}
                        >
                          <Trash2 {...conversationActionIconProps} />
                          Delete
                        </Button>
                      </Box>
                    </Box>
                  ) : null}
                  {isRenamingConversation && activeConversation ? (
                    <Box
                      runaComponent="ai-panel-header-conversation-rename-panel"
                      style={aiHeaderConversationRenamePanelStyle}
                    >
                      <Text style={aiHeaderConversationMenuMetaStyle}>Rename active conversation</Text>
                      <Input
                        aria-label="Conversation title"
                        autoFocus
                        disabled={isConversationBusy}
                        onChange={(event) => setRenameDraft(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void handleRenameConversation()
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setIsRenamingConversation(false)
                            setRenameDraft(activeConversation.title)
                          }
                        }}
                        runaComponent="ai-panel-header-conversation-rename-input"
                        style={aiHeaderConversationRenameInputStyle}
                        value={renameDraft}
                      />
                      <Box
                        runaComponent="ai-panel-header-conversation-rename-actions"
                        style={aiHeaderConversationRenameActionsStyle}
                      >
                        <Button
                          aria-label="Cancel rename"
                          disabled={isConversationBusy}
                          onClick={() => {
                            setIsRenamingConversation(false)
                            setRenameDraft(activeConversation.title)
                          }}
                          runaComponent="ai-panel-header-conversation-rename-cancel"
                          style={aiHeaderConversationActionStyle}
                        >
                          <X {...conversationActionIconProps} />
                          Cancel
                        </Button>
                        <Button
                          aria-label="Save conversation title"
                          disabled={isConversationBusy || renameDraft.trim() === ''}
                          onClick={() => void handleRenameConversation()}
                          runaComponent="ai-panel-header-conversation-rename-save"
                          style={aiHeaderConversationActionStyle}
                        >
                          <Check {...conversationActionIconProps} />
                          Save
                        </Button>
                      </Box>
                    </Box>
                  ) : null}
                  <Box
                    aria-label="Conversation list"
                    id="ai-panel-header-conversation-listbox"
                    role="listbox"
                    runaComponent="ai-panel-header-conversation-list"
                    style={aiHeaderConversationMenuListStyle}
                  >
                    {visibleConversations.length === 0 ? (
                      <Box
                        runaComponent="ai-panel-header-conversation-empty-state"
                        style={aiHeaderConversationEmptyStateStyle}
                      >
                        <Text style={aiHeaderConversationMenuMetaStyle}>
                          No conversations match this filter.
                        </Text>
                      </Box>
                    ) : null}
                    {conversationScope !== 'archived' && filteredRecentConversations.length > 0 ? (
                      <Box
                        runaComponent="ai-panel-header-conversation-section-recent"
                        style={aiHeaderConversationMenuSectionStyle}
                      >
                        <Text style={aiHeaderConversationMenuSectionTitleStyle}>
                          {conversationSectionTitle(conversationScope, false)}
                        </Text>
                        {filteredRecentConversations.map((conversation) => {
                          const isActive = conversation.id === selectedConversationID
                          const isHighlighted = conversation.id === highlightedConversationID
                          const optionIndex = orderedConversationOptions.findIndex(
                            (option) => option.id === conversation.id,
                          )
                          return (
                            <Box
                              key={conversation.id}
                              runaComponent={`ai-panel-header-conversation-row-${conversation.id}`}
                              style={aiHeaderConversationMenuRowStyle}
                            >
                              <Button
                                aria-label={conversationOptionAriaLabel(
                                  conversation,
                                  conversationTitleCounts,
                                )}
                                aria-selected={isActive}
                                disabled={isConversationBusy}
                                id={`ai-panel-header-conversation-option-${conversation.id}`}
                                onFocus={() => setHighlightedConversationID(conversation.id)}
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                }}
                                onKeyDown={handleConversationOptionKeyDown(optionIndex)}
                                onClick={() => {
                                  selectConversationFromNavigator(conversation.id)
                                }}
                                ref={(node) => {
                                  if (node) {
                                    conversationOptionRefs.current.set(conversation.id, node)
                                    return
                                  }
                                  conversationOptionRefs.current.delete(conversation.id)
                                }}
                                role="option"
                                runaComponent={`ai-panel-header-conversation-option-${conversation.id}`}
                                style={{
                                  ...aiHeaderConversationMenuOptionStyle,
                                  ...aiHeaderConversationMenuOptionSelectStyle,
                                  ...(isHighlighted ? aiHeaderConversationMenuOptionHighlightedStyle : null),
                                  ...(isActive ? aiHeaderConversationMenuOptionActiveStyle : null),
                                }}
                              >
                                <Box style={aiHeaderConversationMenuOptionLeadingStyle}>
                                  <Text style={aiHeaderConversationSummaryTitleStyle}>
                                    {formatConversationTitle(conversation)}
                                  </Text>
                                  <Text style={aiHeaderConversationMenuMetaStyle}>
                                    {formatConversationCount(conversation)} ·{' '}
                                    {formatConversationUpdatedAt(conversation.updated_at)}
                                  </Text>
                                </Box>
                              </Button>
                              <Box style={aiHeaderConversationMenuRowActionsStyle}>
                                <Button
                                  aria-label={`Archive conversation ${formatConversationTitle(conversation)}`}
                                  disabled={isConversationBusy || onArchiveConversation == null}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                  }}
                                  onClick={() => {
                                    void handleArchiveConversation(conversation.id)
                                  }}
                                  runaComponent={`ai-panel-header-conversation-row-archive-${conversation.id}`}
                                  style={aiHeaderConversationMenuRowActionStyle}
                                  title="Archive conversation"
                                >
                                  <Archive {...conversationActionIconProps} />
                                </Button>
                                <Button
                                  aria-label={`Delete conversation ${formatConversationTitle(conversation)}`}
                                  disabled={isConversationBusy || onDeleteConversation == null}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                  }}
                                  onClick={() => {
                                    openDeleteConversationConfirm(conversation.id)
                                  }}
                                  runaComponent={`ai-panel-header-conversation-row-delete-${conversation.id}`}
                                  style={aiHeaderConversationMenuRowActionStyle}
                                  title="Delete conversation"
                                >
                                  <Trash2 {...conversationActionIconProps} />
                                </Button>
                              </Box>
                            </Box>
                          )
                        })}
                      </Box>
                    ) : null}
                    {conversationScope !== 'recent' && filteredArchivedConversations.length > 0 ? (
                      <Box
                        runaComponent="ai-panel-header-conversation-section-archived"
                        style={aiHeaderConversationMenuSectionStyle}
                      >
                        <Text style={aiHeaderConversationMenuSectionTitleStyle}>
                          {conversationSectionTitle(conversationScope, true)}
                        </Text>
                        {filteredArchivedConversations.map((conversation) => {
                          const isActive = conversation.id === selectedConversationID
                          const isHighlighted = conversation.id === highlightedConversationID
                          const optionIndex = orderedConversationOptions.findIndex(
                            (option) => option.id === conversation.id,
                          )
                          return (
                            <Box
                              key={conversation.id}
                              runaComponent={`ai-panel-header-conversation-row-${conversation.id}`}
                              style={aiHeaderConversationMenuRowStyle}
                            >
                              <Button
                                aria-label={conversationOptionAriaLabel(
                                  conversation,
                                  conversationTitleCounts,
                                )}
                                aria-selected={isActive}
                                disabled={isConversationBusy}
                                id={`ai-panel-header-conversation-option-${conversation.id}`}
                                onFocus={() => setHighlightedConversationID(conversation.id)}
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                }}
                                onKeyDown={handleConversationOptionKeyDown(optionIndex)}
                                onClick={() => {
                                  selectConversationFromNavigator(conversation.id)
                                }}
                                ref={(node) => {
                                  if (node) {
                                    conversationOptionRefs.current.set(conversation.id, node)
                                    return
                                  }
                                  conversationOptionRefs.current.delete(conversation.id)
                                }}
                                role="option"
                                runaComponent={`ai-panel-header-conversation-option-${conversation.id}`}
                                style={{
                                  ...aiHeaderConversationMenuOptionStyle,
                                  ...aiHeaderConversationMenuOptionSelectStyle,
                                  ...(isHighlighted ? aiHeaderConversationMenuOptionHighlightedStyle : null),
                                  ...(isActive ? aiHeaderConversationMenuOptionActiveStyle : null),
                                }}
                              >
                                <Box style={aiHeaderConversationMenuOptionLeadingStyle}>
                                  <Text style={aiHeaderConversationSummaryTitleStyle}>
                                    {formatConversationTitle(conversation)}
                                  </Text>
                                  <Text style={aiHeaderConversationMenuMetaStyle}>
                                    {formatConversationCount(conversation)} · Archived{' '}
                                    {formatConversationUpdatedAt(
                                      conversation.archived_at ?? conversation.updated_at,
                                    )}
                                  </Text>
                                </Box>
                              </Button>
                              <Box style={aiHeaderConversationMenuRowActionsStyle}>
                                <Button
                                  aria-label={`Restore conversation ${formatConversationTitle(conversation)}`}
                                  disabled={isConversationBusy || onRestoreConversation == null}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                  }}
                                  onClick={() => {
                                    void handleRestoreConversation(conversation.id)
                                  }}
                                  runaComponent={`ai-panel-header-conversation-row-restore-${conversation.id}`}
                                  style={aiHeaderConversationMenuRowActionStyle}
                                  title="Restore conversation"
                                >
                                  <RotateCcw {...conversationActionIconProps} />
                                </Button>
                                <Button
                                  aria-label={`Delete conversation ${formatConversationTitle(conversation)}`}
                                  disabled={isConversationBusy || onDeleteConversation == null}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                  }}
                                  onClick={() => {
                                    openDeleteConversationConfirm(conversation.id)
                                  }}
                                  runaComponent={`ai-panel-header-conversation-row-delete-${conversation.id}`}
                                  style={aiHeaderConversationMenuRowActionStyle}
                                  title="Delete conversation"
                                >
                                  <Trash2 {...conversationActionIconProps} />
                                </Button>
                              </Box>
                            </Box>
                          )
                        })}
                      </Box>
                    ) : null}
                  </Box>
                </Surface>
              </Box>
            ) : null}
          </Box>
        </Box>
        <Box runaComponent="ai-panel-header-mode-group" style={aiHeaderModeGroupStyle}>
          {CHAT_MODES.map((chatMode) => (
            <Button
              aria-pressed={mode === chatMode}
              key={chatMode}
              onClick={() => onModeChange(chatMode)}
              runaComponent={`ai-panel-header-mode-${chatMode}`}
              style={{
                ...aiHeaderModeButtonStyle,
                ...(mode === chatMode ? aiHeaderModeButtonActiveStyle : null),
              }}
            >
              {chatMode}
            </Button>
          ))}
        </Box>
      </Surface>
    </RunaDomScopeProvider>
  )
}
