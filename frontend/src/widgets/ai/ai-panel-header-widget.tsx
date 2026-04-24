import runaAvatar from '@assets/img/logo.png'
import type { AgentConversationSummary } from '@/features/agent/api/client'
import type { ChatMode } from '@/features/agent/model/types'
import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { Avatar } from '@/shared/ui/components'
import { Box, Button, Select, Surface, Text } from '@/shared/ui/primitives'

import {
  aiHeaderConversationActionStyle,
  aiHeaderConversationGroupStyle,
  aiHeaderConversationLabelStyle,
  aiHeaderConversationSelectStyle,
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

function formatConversationOptionLabel(conversation: AgentConversationSummary) {
  const title = conversation.title.trim() || 'New conversation'
  const suffix = conversation.message_count === 1 ? '1 msg' : `${conversation.message_count} msgs`
  return `${title} · ${suffix}`
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
  const hasConversationOptions = conversations.length > 0
  const selectedConversationID = activeConversationID || conversations[0]?.id || ''

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
          <Box runaComponent="ai-panel-header-conversation-group" style={aiHeaderConversationGroupStyle}>
            <Text runaComponent="ai-panel-header-conversation-label" style={aiHeaderConversationLabelStyle}>
              Conversation
            </Text>
            <Select
              aria-label="Conversation"
              disabled={isConversationBusy || !hasConversationOptions}
              onChange={(event) => {
                const nextConversationID = event.target.value.trim()
                if (nextConversationID) {
                  onConversationSelect?.(nextConversationID)
                }
              }}
              runaComponent="ai-panel-header-conversation-select"
              style={aiHeaderConversationSelectStyle}
              title={
                hasConversationOptions
                  ? conversations.find((conversation) => conversation.id === selectedConversationID)?.title
                  : 'Loading conversations'
              }
              value={selectedConversationID}
            >
              {hasConversationOptions ? (
                conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {formatConversationOptionLabel(conversation)}
                  </option>
                ))
              ) : (
                <option value="">Loading conversations</option>
              )}
            </Select>
            <Button
              aria-label="Create conversation"
              disabled={isConversationBusy || onCreateConversation == null}
              onClick={() => onCreateConversation?.()}
              runaComponent="ai-panel-header-conversation-create"
              style={aiHeaderConversationActionStyle}
            >
              New
            </Button>
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
