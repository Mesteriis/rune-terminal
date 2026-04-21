import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchAgentConversation,
  streamAgentConversationMessage,
  type AgentConversationMessage,
  type AgentConversationProvider,
  type AgentConversationStreamConnection,
} from '@/features/agent/api/client'
import {
  appendAgentConversationMessage,
  appendAgentPanelStatusPrompt,
  applyAgentConversationStreamEvent,
  createAgentPanelErrorState,
  createAgentPanelLoadingState,
  createAgentPanelStateFromMessages,
  finalizeAgentConversationStreamingMessages,
  removeAgentConversationMessage,
} from '@/features/agent/model/panel-state'
import type { AiPanelWidgetState } from '@/features/agent/model/types'
import { resolveRuntimeContext } from '@/shared/api/runtime'

function createOptimisticUserConversationMessage(
  hostId: string,
  sequence: number,
  prompt: string,
): AgentConversationMessage {
  return {
    id: `agent-local-user-${hostId}-${sequence}`,
    role: 'user',
    content: prompt,
    status: 'complete',
    created_at: new Date().toISOString(),
  }
}

function ensureOptimisticUserMessage(
  currentMessages: AgentConversationMessage[] | null,
  optimisticUserMessage: AgentConversationMessage,
) {
  const nextMessages = currentMessages ?? []

  if (nextMessages.some((message) => message.id === optimisticUserMessage.id)) {
    return nextMessages
  }

  return appendAgentConversationMessage(nextMessages, optimisticUserMessage)
}

export function useAgentPanel(hostId: string, enabled = true) {
  const [messages, setMessages] = useState<AgentConversationMessage[] | null>(null)
  const [provider, setProvider] = useState<AgentConversationProvider | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const activeStreamRef = useRef<AgentConversationStreamConnection | null>(null)
  const optimisticMessageCounterRef = useRef(0)

  useEffect(() => {
    return () => {
      activeStreamRef.current?.close()
      activeStreamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    activeStreamRef.current?.close()
    activeStreamRef.current = null
    setMessages(null)
    setProvider(null)
    setLoadError(null)
    setSubmitError(null)
    setIsSubmitting(false)

    void fetchAgentConversation()
      .then((conversation) => {
        if (cancelled) {
          return
        }

        setMessages(conversation.messages)
        setProvider(conversation.provider)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : `Unable to load backend conversation for ${hostId}.`

        setLoadError(message)
      })

    return () => {
      cancelled = true
      activeStreamRef.current?.close()
      activeStreamRef.current = null
    }
  }, [enabled, hostId])

  const submitDraft = useCallback(async () => {
    const prompt = draft.trim()

    if (!enabled || isSubmitting || prompt === '') {
      return
    }

    const optimisticUserMessage = createOptimisticUserConversationMessage(
      hostId,
      optimisticMessageCounterRef.current,
      prompt,
    )
    optimisticMessageCounterRef.current += 1

    setIsSubmitting(true)
    setLoadError(null)
    setSubmitError(null)
    setMessages((currentMessages) =>
      appendAgentConversationMessage(currentMessages ?? [], optimisticUserMessage),
    )

    let sawStreamEvent = false
    let sawCompletionEvent = false
    let connection: AgentConversationStreamConnection | null = null

    try {
      const runtimeContext = await resolveRuntimeContext()

      connection = await streamAgentConversationMessage(
        {
          prompt,
          context: {
            action_source: 'frontend.ai.sidebar',
            active_widget_id: hostId,
            repo_root: runtimeContext.repoRoot,
            widget_context_enabled: true,
          },
        },
        {
          onEvent: (event) => {
            sawStreamEvent = true

            setMessages((currentMessages) =>
              applyAgentConversationStreamEvent(
                ensureOptimisticUserMessage(currentMessages, optimisticUserMessage),
                event,
              ),
            )

            if (event.type === 'message-complete') {
              sawCompletionEvent = true
              setDraft('')
            } else if (event.type === 'error' && !event.message && event.error?.trim()) {
              setSubmitError(event.error.trim())
            }
          },
        },
      )
      activeStreamRef.current = connection
      await connection.done
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : `Unable to send backend conversation message for ${hostId}.`

      if (!sawStreamEvent) {
        setMessages((currentMessages) =>
          removeAgentConversationMessage(currentMessages ?? [], optimisticUserMessage.id),
        )
      } else {
        setMessages((currentMessages) =>
          finalizeAgentConversationStreamingMessages(
            ensureOptimisticUserMessage(currentMessages, optimisticUserMessage),
            message,
          ),
        )
      }

      setSubmitError(message)
    } finally {
      if (activeStreamRef.current === connection) {
        activeStreamRef.current = null
      }

      setIsSubmitting(false)

      if (!sawCompletionEvent && !sawStreamEvent) {
        setDraft(prompt)
      }
    }
  }, [draft, enabled, hostId, isSubmitting])

  const panelState = useMemo(() => {
    let baseState: AiPanelWidgetState

    if (messages == null) {
      baseState = loadError ? createAgentPanelErrorState(loadError) : createAgentPanelLoadingState()
    } else {
      baseState = createAgentPanelStateFromMessages(messages, provider)
    }

    if (!submitError) {
      return baseState
    }

    return appendAgentPanelStatusPrompt(baseState, {
      id: 'agent-submit-error',
      title: 'Conversation',
      preview: submitError,
      reasoning: ['Route: POST /api/v1/agent/conversation/messages/stream'],
      summary: 'Backend error',
    })
  }, [loadError, messages, provider, submitError])

  return {
    draft,
    isSubmitting,
    panelState,
    setDraft,
    submitDraft,
  }
}
