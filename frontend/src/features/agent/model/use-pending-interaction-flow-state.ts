import { useCallback, useRef, useState } from 'react'

import type { PendingInteractionFlow } from '@/features/agent/model/interaction-flow'

export function usePendingInteractionFlowState() {
  const [pendingFlow, setPendingFlow] = useState<PendingInteractionFlow | null>(null)
  const pendingFlowRef = useRef<PendingInteractionFlow | null>(null)

  const setPendingInteractionFlow = useCallback((flow: PendingInteractionFlow | null) => {
    pendingFlowRef.current = flow
    setPendingFlow(flow)
  }, [])

  const clearPendingInteractionFlow = useCallback(() => {
    pendingFlowRef.current = null
    setPendingFlow(null)
  }, [])

  const getPendingInteractionFlow = useCallback(() => pendingFlowRef.current, [])

  return {
    clearPendingInteractionFlow,
    getPendingInteractionFlow,
    pendingFlow,
    pendingFlowRef,
    setPendingInteractionFlow,
  }
}
