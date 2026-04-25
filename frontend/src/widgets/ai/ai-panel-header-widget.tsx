import { useEffect, useMemo, useRef, useState } from 'react'

import { Check, ChevronDown, MessageSquareMore, Pencil, Plus, Trash2, X } from 'lucide-react'

import runaAvatar from '@assets/img/logo.png'
import type { AgentConversationSummary } from '@/features/agent/api/client'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Avatar } from '@/shared/ui/components'
import { Box, Button, Input, Surface, Text } from '@/shared/ui/primitives'

import {
  aiHeaderConversationActionStyle,
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
  aiHeaderConversationMenuOptionLeadingStyle,
  aiHeaderConversationMenuOptionStyle,
  aiHeaderConversationMenuSummaryStyle,
  aiHeaderConversationRenameActionsStyle,
  aiHeaderConversationRenameInputStyle,
  aiHeaderConversationRenamePanelStyle,
  aiHeaderConversationSearchInputStyle,
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
  aiShellHeaderTitleLaneStyle,
  aiShellTitleClusterStyle,
  aiShellTitleTextStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPanelHeaderWidgetProps = {
  activeConversationID?: string
  conversations?: AgentConversationSummary[]
  isConversationBusy?: boolean
  mode: ChatMode
  onConversationSelect?: (conversationID: string) => void
  onCreateConversation?: () => void
  onDeleteConversation?: (conversationID: string) => Promise<void> | void
  onRenameConversation?: (conversationID: string, title: string) => Promise<void> | void
  onModeChange: (mode: ChatMode) => void
  title: string
}

const CHAT_MODES: ChatMode[] = ['chat', 'dev', 'debug']
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

export function AiPanelHeaderWidget({
  activeConversationID = '',
  conversations = [],
  isConversationBusy = false,
  mode,
  onConversationSelect,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onModeChange,
  title,
}: AiPanelHeaderWidgetProps) {
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false)
  const [isRenamingConversation, setIsRenamingConversation] = useState(false)
  const [isDeleteConversationConfirmOpen, setIsDeleteConversationConfirmOpen] = useState(false)
  const [conversationSearchQuery, setConversationSearchQuery] = useState('')
  const [renameDraft, setRenameDraft] = useState('')
  const [optimisticConversationTitle, setOptimisticConversationTitle] = useState('')
  const conversationMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const hasConversationOptions = conversations.length > 0
  const selectedConversationID = activeConversationID || conversations[0]?.id || ''
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationID) ?? null,
    [conversations, selectedConversationID],
  )
  const activeConversationTitle = activeConversation
    ? formatConversationTitle(activeConversation)
    : 'Loading conversations'
  const displayedConversationTitle = optimisticConversationTitle.trim() || activeConversationTitle
  const activeConversationMeta = activeConversation
    ? `${formatConversationCount(activeConversation)} · ${formatConversationUpdatedAt(activeConversation.updated_at)}`
    : 'Recent thread list'
  const canRenameConversation = activeConversation != null && onRenameConversation != null
  const canDeleteConversation = activeConversation != null && onDeleteConversation != null
  const normalizedConversationSearchQuery = conversationSearchQuery.trim().toLowerCase()
  const filteredConversations = useMemo(() => {
    if (normalizedConversationSearchQuery === '') {
      return conversations
    }

    return conversations.filter((conversation) =>
      formatConversationTitle(conversation).toLowerCase().includes(normalizedConversationSearchQuery),
    )
  }, [conversations, normalizedConversationSearchQuery])

  useEffect(() => {
    if (!isConversationMenuOpen) {
      setIsRenamingConversation(false)
      setIsDeleteConversationConfirmOpen(false)
      setConversationSearchQuery('')
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
    if (!activeConversation || onDeleteConversation == null) {
      return
    }

    setIsDeleteConversationConfirmOpen(false)
    setIsConversationMenuOpen(false)
    await onDeleteConversation(activeConversation.id)
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
              disabled={isConversationBusy || !hasConversationOptions}
              onClick={() => setIsConversationMenuOpen((currentValue) => !currentValue)}
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
                          {normalizedConversationSearchQuery !== ''
                            ? ` · ${filteredConversations.length} shown`
                            : ''}
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
                          aria-label="Delete conversation"
                          disabled={isConversationBusy || !canDeleteConversation}
                          onClick={() => {
                            setIsRenamingConversation(false)
                            setIsDeleteConversationConfirmOpen(true)
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
                      <Input
                        aria-label="Search conversations"
                        disabled={isConversationBusy || conversations.length === 0}
                        onChange={(event) => setConversationSearchQuery(event.currentTarget.value)}
                        placeholder="Search conversations"
                        runaComponent="ai-panel-header-conversation-search-input"
                        style={aiHeaderConversationSearchInputStyle}
                        value={conversationSearchQuery}
                      />
                    </Box>
                  </Box>
                  {isDeleteConversationConfirmOpen && activeConversation ? (
                    <Box
                      runaComponent="ai-panel-header-conversation-delete-panel"
                      style={aiHeaderConversationRenamePanelStyle}
                    >
                      <Text style={aiHeaderConversationMenuMetaStyle}>Delete active conversation</Text>
                      <Text style={aiHeaderConversationSummaryTitleStyle}>
                        {formatConversationTitle(activeConversation)}
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
                    role="listbox"
                    runaComponent="ai-panel-header-conversation-list"
                    style={aiHeaderConversationMenuListStyle}
                  >
                    {filteredConversations.length === 0 ? (
                      <Box
                        runaComponent="ai-panel-header-conversation-empty-state"
                        style={aiHeaderConversationEmptyStateStyle}
                      >
                        <Text style={aiHeaderConversationMenuMetaStyle}>
                          No conversations match this filter.
                        </Text>
                      </Box>
                    ) : null}
                    {filteredConversations.map((conversation) => {
                      const isActive = conversation.id === selectedConversationID
                      return (
                        <Button
                          aria-label={`Open conversation ${formatConversationTitle(conversation)}`}
                          aria-selected={isActive}
                          key={conversation.id}
                          onClick={() => {
                            setIsConversationMenuOpen(false)
                            onConversationSelect?.(conversation.id)
                          }}
                          role="option"
                          runaComponent={`ai-panel-header-conversation-option-${conversation.id}`}
                          style={{
                            ...aiHeaderConversationMenuOptionStyle,
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
                      )
                    })}
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
