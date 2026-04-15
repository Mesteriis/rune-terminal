import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { mapConversationToFeedEntries } from '../lib/agentConversation'
import type {
  AgentConversationSnapshot,
  AgentFeedEntry,
  AgentTerminalCommandExplanationResult,
  RuntimeNotice,
  WorkspaceContextSummary,
} from '../types'

type ConversationClient = {
  conversation: () => Promise<AgentConversationSnapshot>
  submitConversationMessage: (input: {
    prompt: string
    context?: {
      workspace_id?: string
      repo_root?: string
      active_widget_id?: string
      widget_context_enabled?: boolean
    }
  }) => Promise<{ conversation: AgentConversationSnapshot; provider_error?: string }>
  explainTerminalCommand: (input: {
    prompt: string
    command: string
    widget_id?: string
    from_seq?: number
    approval_used?: boolean
    context?: {
      workspace_id?: string
      repo_root?: string
      active_widget_id?: string
      widget_context_enabled?: boolean
    }
  }) => Promise<AgentTerminalCommandExplanationResult>
}

type NoticeSetter = Dispatch<SetStateAction<RuntimeNotice | null>>

type UseConversationParams = {
  client: ConversationClient | null
  workspaceContext: WorkspaceContextSummary | null
  setNotice: NoticeSetter
}

const emptySnapshot: AgentConversationSnapshot = {
  messages: [],
  provider: {
    kind: 'ollama',
    base_url: 'http://192.168.1.2:11434',
    streaming: false,
  },
  updated_at: new Date(0).toISOString(),
}

export function useConversation({ client, workspaceContext, setNotice }: UseConversationParams) {
  const [conversation, setConversation] = useState<AgentConversationSnapshot>(emptySnapshot)
  const [isSubmittingConversation, setIsSubmittingConversation] = useState(false)

  const refreshConversation = useCallback(async () => {
    if (!client) {
      setConversation(emptySnapshot)
      return
    }
    try {
      setConversation(await client.conversation())
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to load conversation',
        detail: formatError(error),
      })
    }
  }, [client, setNotice])

  useEffect(() => {
    void refreshConversation()
  }, [refreshConversation])

  const submitConversationPrompt = useCallback(async (prompt: string) => {
    if (!client) {
      return
    }
    setIsSubmittingConversation(true)
    try {
      const result = await client.submitConversationMessage({
        prompt,
        context: workspaceContext ? {
          workspace_id: workspaceContext.workspace_id,
          repo_root: workspaceContext.repo_root,
          active_widget_id: workspaceContext.active_widget_id,
          widget_context_enabled: workspaceContext.widget_context_enabled,
        } : undefined,
      })
      setConversation(result.conversation)
      if (result.provider_error) {
        setNotice({
          tone: 'error',
          title: 'Assistant response failed',
          detail: result.provider_error,
        })
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Conversation request failed',
        detail: formatError(error),
      })
    } finally {
      setIsSubmittingConversation(false)
    }
  }, [client, setNotice, workspaceContext])

  const explainTerminalCommand = useCallback(async (input: {
    prompt: string
    command: string
    widget_id?: string
    from_seq?: number
    approval_used?: boolean
  }) => {
    if (!client) {
      return null
    }
    setIsSubmittingConversation(true)
    try {
      const result = await client.explainTerminalCommand({
        ...input,
        context: workspaceContext ? {
          workspace_id: workspaceContext.workspace_id,
          repo_root: workspaceContext.repo_root,
          active_widget_id: workspaceContext.active_widget_id,
          widget_context_enabled: workspaceContext.widget_context_enabled,
        } : undefined,
      })
      setConversation(result.conversation)
      if (result.provider_error) {
        setNotice({
          tone: 'error',
          title: 'Assistant explanation failed',
          detail: result.provider_error,
        })
      }
      return result
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to explain terminal result',
        detail: formatError(error),
      })
      return null
    } finally {
      setIsSubmittingConversation(false)
    }
  }, [client, setNotice, workspaceContext])

  const conversationFeed = useMemo<AgentFeedEntry[]>(
    () => mapConversationToFeedEntries(conversation.messages),
    [conversation.messages],
  )

  return {
    conversation,
    conversationFeed,
    isSubmittingConversation,
    refreshConversation,
    submitConversationPrompt,
    explainTerminalCommand,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
