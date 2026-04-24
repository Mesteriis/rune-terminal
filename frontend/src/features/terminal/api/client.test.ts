import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createTerminalTab,
  closeTerminalTab,
  connectTerminalStream,
  fetchTerminalSnapshot,
  interruptTerminal,
  restartTerminal,
  sendTerminalInput,
  TerminalAPIError,
} from '@/features/terminal/api/client'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

function createStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }

      controller.close()
    },
  })
}

describe('terminal api client', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads terminal snapshots from the backend contract', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            widget_id: 'term-main',
            session_id: 'term-main',
            shell: '/bin/zsh',
            status: 'running',
            pid: 4242,
            started_at: '2026-04-21T08:00:00Z',
            can_send_input: true,
            can_interrupt: true,
            working_dir: '/Users/avm/projects/runa-terminal',
            connection_id: 'local',
            connection_name: 'Local Machine',
            connection_kind: 'local',
          },
          chunks: [
            {
              seq: 3,
              data: 'pwd\n',
              timestamp: '2026-04-21T08:01:00Z',
            },
          ],
          next_seq: 4,
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTerminalSnapshot('term-main', 3)).resolves.toEqual({
      state: {
        widget_id: 'term-main',
        session_id: 'term-main',
        shell: '/bin/zsh',
        status: 'running',
        pid: 4242,
        started_at: '2026-04-21T08:00:00Z',
        can_send_input: true,
        can_interrupt: true,
        working_dir: '/Users/avm/projects/runa-terminal',
        connection_id: 'local',
        connection_name: 'Local Machine',
        connection_kind: 'local',
      },
      chunks: [
        {
          seq: 3,
          data: 'pwd\n',
          timestamp: '2026-04-21T08:01:00Z',
        },
      ],
      next_seq: 4,
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-main?from=3')
  })

  it('normalizes null terminal chunk payloads to an empty array', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            widget_id: 'term-fresh',
            session_id: 'term-fresh',
            shell: '/bin/zsh',
            status: 'running',
            pid: 4242,
            started_at: '2026-04-24T08:00:00Z',
            can_send_input: true,
            can_interrupt: true,
            working_dir: '/Users/avm/projects/runa-terminal',
            connection_id: 'local',
            connection_name: 'Local Machine',
            connection_kind: 'local',
          },
          chunks: null,
          next_seq: 1,
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTerminalSnapshot('term-fresh')).resolves.toEqual({
      state: {
        widget_id: 'term-fresh',
        session_id: 'term-fresh',
        shell: '/bin/zsh',
        status: 'running',
        pid: 4242,
        started_at: '2026-04-24T08:00:00Z',
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
  })

  it('posts input, interrupt and restart requests to the backend contract', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          widget_id: 'term-main',
          bytes_sent: 4,
          append_newline: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            widget_id: 'term-main',
            session_id: 'term-main',
            shell: '/bin/zsh',
            status: 'running',
            pid: 5252,
            started_at: '2026-04-21T08:02:00Z',
            can_send_input: true,
            can_interrupt: true,
            connection_id: 'local',
            connection_name: 'Local Machine',
            connection_kind: 'local',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            widget_id: 'term-main',
            session_id: 'term-main',
            shell: '/bin/zsh',
            status: 'running',
            pid: 5252,
            started_at: '2026-04-21T08:02:00Z',
            can_send_input: true,
            can_interrupt: true,
            connection_id: 'local',
            connection_name: 'Local Machine',
            connection_kind: 'local',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendTerminalInput('term-main', 'pwd', true)).resolves.toEqual({
      widget_id: 'term-main',
      bytes_sent: 4,
      append_newline: true,
    })
    await expect(restartTerminal('term-main')).resolves.toEqual({
      widget_id: 'term-main',
      session_id: 'term-main',
      shell: '/bin/zsh',
      status: 'running',
      pid: 5252,
      started_at: '2026-04-21T08:02:00Z',
      can_send_input: true,
      can_interrupt: true,
      connection_id: 'local',
      connection_name: 'Local Machine',
      connection_kind: 'local',
    })
    await expect(interruptTerminal('term-main')).resolves.toEqual({
      widget_id: 'term-main',
      session_id: 'term-main',
      shell: '/bin/zsh',
      status: 'running',
      pid: 5252,
      started_at: '2026-04-21T08:02:00Z',
      can_send_input: true,
      can_interrupt: true,
      connection_id: 'local',
      connection_name: 'Local Machine',
      connection_kind: 'local',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-main/input')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      text: 'pwd',
      append_newline: true,
    })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-main/restart')
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
    })
    expect(fetchMock.mock.calls[3]?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-main/interrupt')
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: 'POST',
    })
  })

  it('creates a backend-backed terminal tab and returns its widget id', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tab_id: 'tab-created',
          widget_id: 'term-created',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTerminalTab('Workspace shell')).resolves.toEqual({
      tab_id: 'tab-created',
      widget_id: 'term-created',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/workspace/tabs')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      title: 'Workspace shell',
    })
  })

  it('closes a backend-backed terminal tab by tab id', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          closed_tab_id: 'tab-created',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(closeTerminalTab('tab-created')).resolves.toEqual({
      closed_tab_id: 'tab-created',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/workspace/tabs/tab-created')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'DELETE',
    })
  })

  it('connects terminal stream output through the backend SSE route', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: createStreamResponse([
          ': keepalive\n\n',
          'event: output\ndata: {"seq":4,"data":"pwd\\n","timestamp":"2026-04-21T08:03:00Z"}\n\n',
          'event: output\ndata: {"seq":5,"data":"/Users/avm/projects/runa-terminal\\n","timestamp":"2026-04-21T08:03:01Z"}\n\n',
        ]),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    const output: Array<{ seq: number; data: string }> = []
    const connection = await connectTerminalStream('term-main', {
      from: 4,
      onOutput: (chunk) => {
        output.push({ seq: chunk.seq, data: chunk.data })
      },
    })

    await connection.done

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-main/stream?from=4')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        Authorization: 'Bearer runtime-token',
      },
    })
    expect(output).toEqual([
      { seq: 4, data: 'pwd\n' },
      { seq: 5, data: '/Users/avm/projects/runa-terminal\n' },
    ])
  })

  it('surfaces backend error envelopes as terminal api errors', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'widget_not_found',
            message: 'widget not found: term-missing',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTerminalSnapshot('term-missing')).rejects.toEqual(
      new TerminalAPIError(404, 'widget_not_found', 'widget not found: term-missing'),
    )
  })
})
