import { useEffect, useMemo, useRef, useState } from 'react'

import { ChevronDown, MessageSquareMore, Plus } from 'lucide-react'

import runaAvatar from '@assets/img/logo.png'
import type { AgentConversationSummary } from '@/features/agent/api/client'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Avatar } from '@/shared/ui/components'
import { Box, Button, Surface, Text } from '@/shared/ui/primitives'

import {
  aiHeaderConversationActionStyle,
  aiHeaderConversationDropdownHeaderStyle,
  aiHeaderConversationDropdownStyle,
  aiHeaderConversationDropdownWrapStyle,
  aiHeaderConversationGroupStyle,
  aiHeaderConversationLabelStyle,
  aiHeaderConversationMenuListStyle,
  aiHeaderConversationMenuMetaStyle,
  aiHeaderConversationMenuOptionActiveStyle,
  aiHeaderConversationMenuOptionLeadingStyle,
  aiHeaderConversationMenuOptionStyle,
  aiHeaderConversationMenuSummaryStyle,
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
  onModeChange,
  title,
}: AiPanelHeaderWidgetProps) {
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false)
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
  const activeConversationMeta = activeConversation
    ? `${formatConversationCount(activeConversation)} · ${formatConversationUpdatedAt(activeConversation.updated_at)}`
    : 'Recent thread list'

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
              title={activeConversationTitle}
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
                  <Text style={aiHeaderConversationSummaryTitleStyle}>{activeConversationTitle}</Text>
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
                      runaComponent="ai-panel-header-conversation-dropdown-summary"
                      style={aiHeaderConversationMenuSummaryStyle}
                    >
                      <Text style={aiHeaderConversationSummaryTitleStyle}>Conversations</Text>
                      <Text style={aiHeaderConversationMenuMetaStyle}>
                        {conversations.length === 1 ? '1 thread' : `${conversations.length} threads`}
                      </Text>
                    </Box>
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
                  <Box
                    aria-label="Conversation list"
                    role="listbox"
                    runaComponent="ai-panel-header-conversation-list"
                    style={aiHeaderConversationMenuListStyle}
                  >
                    {conversations.map((conversation) => {
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
