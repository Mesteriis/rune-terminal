import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTerminalSnapshot } from '@/features/terminal/api/client'
import {
  agentSelectionOptionsFromItems,
  delayWithAbort,
  getApprovalToken,
  getErrorMessage,
  getRunCommand,
  targetSessionForConnectionKind,
  waitForTerminalOutput,
} from '@/features/agent/model/agent-panel-terminal'

vi.mock('@/features/terminal/api/client', () => ({
  fetchTerminalSnapshot: vi.fn(),
}))

describe('agent panel terminal helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('parses /run prompts and session kinds', () => {
    expect(getRunCommand('/run df -h')).toBe('df -h')
    expect(getRunCommand('/run   ')).toBe('')
    expect(getRunCommand('plain prompt')).toBeNull()
    expect(targetSessionForConnectionKind('ssh')).toBe('remote')
    expect(targetSessionForConnectionKind('local')).toBe('local')
  })

  it('waits for terminal output with bounded retries', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchTerminalSnapshot)
      .mockResolvedValueOnce({
        state: {} as never,
        chunks: [],
        next_seq: 10,
      })
      .mockResolvedValueOnce({
        state: {} as never,
        chunks: [{ seq: 11, data: 'ok\n', timestamp: '2026-04-27T10:00:00Z' }],
        next_seq: 12,
      })

    const waitPromise = waitForTerminalOutput('term-main', 10)
    await vi.advanceTimersByTimeAsync(100)

    await expect(waitPromise).resolves.toMatchObject({
      next_seq: 12,
    })
    expect(fetchTerminalSnapshot).toHaveBeenCalledTimes(2)
  })

  it('aborts delayed waits and resolves helper fallbacks', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()

    const delayPromise = delayWithAbort(100, controller.signal)
    controller.abort()

    await expect(delayPromise).rejects.toThrow('This operation was aborted')
    expect(getErrorMessage(new Error('broken'), 'fallback')).toBe('broken')
    expect(getErrorMessage('broken', 'fallback')).toBe('fallback')
    expect(
      getApprovalToken({
        output: {
          approval_token: 'grant-token',
        },
      } as never),
    ).toBe('grant-token')
    expect(
      agentSelectionOptionsFromItems([{ id: 'role.dev', name: 'Developer', description: 'Writes code' }]),
    ).toEqual([{ value: 'role.dev', label: 'Developer', description: 'Writes code' }])
  })
})
