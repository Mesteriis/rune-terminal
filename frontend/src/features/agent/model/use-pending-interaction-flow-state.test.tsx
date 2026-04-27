import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePendingInteractionFlowState } from '@/features/agent/model/use-pending-interaction-flow-state'

describe('usePendingInteractionFlowState', () => {
  it('keeps state and ref in sync across set and clear operations', () => {
    const { result } = renderHook(() => usePendingInteractionFlowState())

    expect(result.current.pendingFlow).toBeNull()
    expect(result.current.getPendingInteractionFlow()).toBeNull()

    act(() => {
      result.current.setPendingInteractionFlow({
        flowID: 'flow-1',
        prompt: 'help',
        tools: [],
      } as never)
    })

    expect(result.current.pendingFlow).toMatchObject({ flowID: 'flow-1' })
    expect(result.current.pendingFlowRef.current).toMatchObject({ flowID: 'flow-1' })
    expect(result.current.getPendingInteractionFlow()).toMatchObject({ flowID: 'flow-1' })

    act(() => {
      result.current.clearPendingInteractionFlow()
    })

    expect(result.current.pendingFlow).toBeNull()
    expect(result.current.pendingFlowRef.current).toBeNull()
    expect(result.current.getPendingInteractionFlow()).toBeNull()
  })
})
