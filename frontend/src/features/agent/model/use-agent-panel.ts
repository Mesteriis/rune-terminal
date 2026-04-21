import { useEffect, useState } from 'react'

import { fetchAgentConversation } from '@/features/agent/api/client'
import {
  createAgentPanelErrorState,
  createAgentPanelLoadingState,
  createAgentPanelStateFromConversation,
} from '@/features/agent/model/panel-state'
import type { AiPanelWidgetState } from '@/features/agent/model/types'

export function useAgentPanel(hostId: string, enabled = true) {
  const [panelState, setPanelState] = useState<AiPanelWidgetState>(createAgentPanelLoadingState)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    setPanelState(createAgentPanelLoadingState())

    void fetchAgentConversation()
      .then((conversation) => {
        if (cancelled) {
          return
        }

        setPanelState(createAgentPanelStateFromConversation(conversation))
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : `Unable to load backend conversation for ${hostId}.`

        setPanelState(createAgentPanelErrorState(message))
      })

    return () => {
      cancelled = true
    }
  }, [enabled, hostId])

  return panelState
}
