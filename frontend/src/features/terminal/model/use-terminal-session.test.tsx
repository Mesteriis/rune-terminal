import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  connectTerminalStream,
  fetchTerminalSnapshot,
  sendTerminalInput,
} from '@/features/terminal/api/client'
import {
  resetTerminalSessionStoreForTests,
  useTerminalSession,
} from '@/features/terminal/model/use-terminal-session'

vi.mock('@/features/terminal/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/features/terminal/api/client')>(
    '@/features/terminal/api/client',
  )

  return {
    ...actual,
    connectTerminalStream: vi.fn(),
    fetchTerminalSnapshot: vi.fn(),
    sendTerminalInput: vi.fn(),
  }
})

describe('useTerminalSession', () => {
  afterEach(() => {
    resetTerminalSessionStoreForTests()
    vi.clearAllMocks()
  })

  it('maps backend runtime state into the terminal view model', async () => {
    vi.mocked(fetchTerminalSnapshot).mockResolvedValue({
      state: {
        widget_id: 'term-remote',
        session_id: 'term-remote',
        shell: '/bin/zsh',
        status: 'exited',
        pid: 0,
        started_at: '2026-04-21T09:00:00Z',
        last_output_at: '2026-04-21T09:01:00Z',
        exit_code: 127,
        can_send_input: false,
        can_interrupt: false,
        connection_id: 'conn-prod',
        connection_name: 'prod-shell',
        connection_kind: 'ssh',
        status_detail: 'connection not found',
      },
      chunks: [
        {
          seq: 1,
          data: 'ssh: Could not resolve hostname prod-shell\n',
          timestamp: '2026-04-21T09:01:00Z',
        },
      ],
      next_seq: 2,
    })
    vi.mocked(connectTerminalStream).mockResolvedValue({
      close: vi.fn(),
      done: Promise.resolve(),
    })

    const { result } = renderHook(() =>
      useTerminalSession({
        runtimeWidgetId: 'term-remote',
        title: 'Remote shell',
      }),
    )

    await waitFor(() => {
      expect(result.current.runtimeState?.widget_id).toBe('term-remote')
    })

    expect(result.current.runtimeState).toMatchObject({
      widget_id: 'term-remote',
      session_id: 'term-remote',
      shell: '/bin/zsh',
      status: 'exited',
      pid: 0,
      started_at: '2026-04-21T09:00:00Z',
      last_output_at: '2026-04-21T09:01:00Z',
      exit_code: 127,
      can_send_input: false,
      can_interrupt: false,
      connection_id: 'conn-prod',
      connection_name: 'prod-shell',
      connection_kind: 'ssh',
      status_detail: 'connection not found',
    })
    expect(result.current.sessionState).toBe('exited')
    expect(result.current.connectionKind).toBe('ssh')
    expect(result.current.cwd).toBe('prod-shell')
    expect(result.current.shellLabel).toBe('zsh')
    expect(result.current.outputChunks).toEqual([
      {
        seq: 1,
        data: 'ssh: Could not resolve hostname prod-shell\n',
        timestamp: '2026-04-21T09:01:00Z',
      },
    ])
    expect(connectTerminalStream).toHaveBeenCalledWith(
      'term-remote',
      expect.objectContaining({
        from: 2,
      }),
    )
  })

  it('routes input chunks back through the backend terminal client', async () => {
    vi.mocked(fetchTerminalSnapshot).mockResolvedValue({
      state: {
        widget_id: 'term-main',
        session_id: 'term-main',
        shell: '/bin/zsh',
        status: 'running',
        pid: 4242,
        started_at: '2026-04-21T09:10:00Z',
        can_send_input: true,
        can_interrupt: true,
        working_dir: '/Users/avm/projects/runa-terminal',
        connection_id: 'local',
        connection_name: 'Local Machine',
        connection_kind: 'local',
      },
      chunks: [],
      next_seq: 1,
    })
    vi.mocked(connectTerminalStream).mockResolvedValue({
      close: vi.fn(),
      done: Promise.resolve(),
    })
    vi.mocked(sendTerminalInput).mockResolvedValue({
      widget_id: 'term-main',
      bytes_sent: 4,
      append_newline: false,
    })

    const { result } = renderHook(() =>
      useTerminalSession({
        runtimeWidgetId: 'term-main',
        title: 'Main terminal',
      }),
    )

    await waitFor(() => {
      expect(result.current.canSendInput).toBe(true)
    })

    await act(async () => {
      await result.current.sendInputChunk('pwd\r')
    })

    expect(sendTerminalInput).toHaveBeenCalledWith('term-main', 'pwd\r', false)
  })
})
