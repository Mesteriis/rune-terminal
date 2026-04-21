import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchAgentConversation, sendAgentConversationMessage } from '@/features/agent/api/client'
import {
  appendAgentPanelStatusPrompt,
  createAgentPanelErrorState,
  createAgentPanelLoadingState,
  createAgentPanelStateFromConversation,
} from '@/features/agent/model/panel-state'
import type { AiPanelWidgetState } from '@/features/agent/model/types'
import { resolveRuntimeContext } from '@/shared/api/runtime'

export function useAgentPanel(hostId: string, enabled = true) {
  const [conversationState, setConversationState] = useState<AiPanelWidgetState>(createAgentPanelLoadingState)
  const [draft, setDraft] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    setConversationState(createAgentPanelLoadingState())
    setSubmitError(null)

    void fetchAgentConversation()
      .then((conversation) => {
        if (cancelled) {
          return
        }

        setConversationState(createAgentPanelStateFromConversation(conversation))
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : `Unable to load backend conversation for ${hostId}.`

        setConversationState(createAgentPanelErrorState(message))
      })

    return () => {
      cancelled = true
    }
  }, [enabled, hostId])

  const submitDraft = useCallback(async () => {
    const prompt = draft.trim()

    if (!enabled || isSubmitting || prompt === '') {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const runtimeContext = await resolveRuntimeContext()
      const result = await sendAgentConversationMessage({
        prompt,
        context: {
          action_source: 'frontend.ai.sidebar',
          active_widget_id: hostId,
          repo_root: runtimeContext.repoRoot,
          widget_context_enabled: true,
        },
      })

      setConversationState(createAgentPanelStateFromConversation(result.conversation))
      setDraft('')

      if (result.provider_error) {
        setSubmitError(result.provider_error)
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : `Unable to send backend conversation message for ${hostId}.`

      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [draft, enabled, hostId, isSubmitting])

  const panelState = useMemo(() => {
    if (!submitError) {
      return conversationState
    }

    return appendAgentPanelStatusPrompt(conversationState, {
      id: 'agent-submit-error',
      title: 'Conversation',
      preview: submitError,
      reasoning: ['Route: POST /api/v1/agent/conversation/messages'],
      summary: 'Backend error',
    })
  }, [conversationState, submitError])

  return {
    draft,
    isSubmitting,
    panelState,
    setDraft,
    submitDraft,
  }
}
