import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AgentAPIError,
  createAgentAttachmentReference,
  fetchAgentCatalog,
  fetchAgentConversation,
  sendAgentConversationMessage,
  setAgentMode,
  setAgentProfile,
  setAgentRole,
  streamAgentConversationMessage,
} from '@/features/agent/api/client'
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

describe('agent api client', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads the agent catalog from the backend contract', async () => {
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
          profiles: [],
          roles: [],
          modes: [],
          active: {
            profile: {
              id: 'balanced',
              name: 'Balanced',
              description: 'General',
              system_prompt: 'prompt',
              overlay: {},
            },
            role: {
              id: 'developer',
              name: 'Developer',
              description: 'Role',
              prompt: 'role prompt',
              overlay: {},
            },
            mode: {
              id: 'implement',
              name: 'Implement',
              description: 'Mode',
              prompt: 'mode prompt',
              overlay: {},
            },
            effective_prompt: 'prompt',
            effective_policy_profile: {},
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentCatalog()).resolves.toEqual({
      profiles: [],
      roles: [],
      modes: [],
      active: {
        profile: {
          id: 'balanced',
          name: 'Balanced',
          description: 'General',
          system_prompt: 'prompt',
          overlay: {},
        },
        role: {
          id: 'developer',
          name: 'Developer',
          description: 'Role',
          prompt: 'role prompt',
          overlay: {},
        },
        mode: {
          id: 'implement',
          name: 'Implement',
          description: 'Mode',
          prompt: 'mode prompt',
          overlay: {},
        },
        effective_prompt: 'prompt',
        effective_policy_profile: {},
      },
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent')
  })

  it('loads conversation snapshots from the backend contract', async () => {
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
          conversation: {
            messages: [
              {
                id: 'msg_1',
                role: 'user',
                content: 'hello',
                status: 'complete',
                created_at: '2026-04-21T10:00:00Z',
              },
            ],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            updated_at: '2026-04-21T10:00:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentConversation()).resolves.toEqual({
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'hello',
          status: 'complete',
          created_at: '2026-04-21T10:00:00Z',
        },
      ],
      provider: {
        kind: 'stub',
        base_url: 'http://stub',
        model: 'stub-model',
        streaming: false,
      },
      updated_at: '2026-04-21T10:00:00Z',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversation')
  })

  it('posts typed message and attachment payloads to the agent backend routes', async () => {
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
          conversation: {
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              streaming: false,
            },
            updated_at: '2026-04-21T10:00:00Z',
          },
          provider_error: '',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          attachment: {
            id: 'att_1',
            name: 'notes.txt',
            path: '/tmp/notes.txt',
            mime_type: 'text/plain',
            size: 5,
            modified_time: 1713279000,
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await sendAgentConversationMessage({
      prompt: 'hello there',
      attachments: [
        {
          id: 'att_1',
          name: 'notes.txt',
          path: '/tmp/notes.txt',
          mime_type: 'text/plain',
          size: 5,
          modified_time: 1713279000,
        },
      ],
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_context_enabled: true,
      },
    })
    await createAgentAttachmentReference({
      path: '/tmp/notes.txt',
      workspace_id: 'ws-default',
      action_source: 'frontend.ai.sidebar',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversation/messages')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      prompt: 'hello there',
      attachments: [
        {
          id: 'att_1',
          name: 'notes.txt',
          path: '/tmp/notes.txt',
          mime_type: 'text/plain',
          size: 5,
          modified_time: 1713279000,
        },
      ],
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_context_enabled: true,
      },
    })
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversation/attachments/references',
    )
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      path: '/tmp/notes.txt',
      workspace_id: 'ws-default',
      action_source: 'frontend.ai.sidebar',
    })
  })

  it('connects the agent conversation stream through the backend SSE route', async () => {
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
          'event: message-start\ndata: {"type":"message-start","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:01Z"}}\n\n',
          'event: text-delta\ndata: {"type":"text-delta","message_id":"msg_2","delta":"hello "}\n\n',
          'event: text-delta\ndata: {"type":"text-delta","message_id":"msg_2","delta":"world"}\n\n',
          'event: message-complete\ndata: {"type":"message-complete","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"hello world","status":"complete","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:01Z"}}\n\n',
        ]),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    const events: string[] = []
    const connection = await streamAgentConversationMessage(
      {
        prompt: 'hello there',
        context: {
          action_source: 'frontend.ai.sidebar',
          active_widget_id: 'ai-shell-panel',
          repo_root: '/Users/avm/projects/runa-terminal',
          widget_context_enabled: true,
        },
      },
      {
        onEvent: (event) => {
          events.push(event.type)
        },
      },
    )

    await connection.done

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversation/messages/stream',
    )
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      prompt: 'hello there',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_context_enabled: true,
      },
    })
    expect(events).toEqual(['message-start', 'text-delta', 'text-delta', 'message-complete'])
  })

  it('rejects unsupported backend stream event types', async () => {
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
        body: createStreamResponse(['event: unknown\ndata: {"type":"unknown"}\n\n']),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    const connection = await streamAgentConversationMessage(
      {
        prompt: 'hello there',
        context: {
          action_source: 'frontend.ai.sidebar',
        },
      },
      {
        onEvent: () => {},
      },
    )

    await expect(connection.done).rejects.toThrow('Unsupported agent stream event type: unknown')
  })

  it('maps selection updates to the existing backend routes', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          profiles: [],
          roles: [],
          modes: [],
          active: {
            profile: {
              id: 'balanced',
              name: 'Balanced',
              description: 'General',
              system_prompt: 'prompt',
              overlay: {},
            },
            role: {
              id: 'developer',
              name: 'Developer',
              description: 'Role',
              prompt: 'role prompt',
              overlay: {},
            },
            mode: {
              id: 'implement',
              name: 'Implement',
              description: 'Mode',
              prompt: 'mode prompt',
              overlay: {},
            },
            effective_prompt: 'prompt',
            effective_policy_profile: {},
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await setAgentProfile('balanced')
    await setAgentRole('developer')
    await setAgentMode('implement')

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/selection/profile')
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/selection/role')
    expect(fetchMock.mock.calls[3]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/selection/mode')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({ id: 'balanced' }),
      method: 'PUT',
    })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({ id: 'developer' }),
      method: 'PUT',
    })
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      body: JSON.stringify({ id: 'implement' }),
      method: 'PUT',
    })
  })

  it('surfaces typed backend errors', async () => {
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
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
              code: 'work_mode_not_found',
              message: 'work mode not found: missing',
            },
          }),
        }),
    )

    await expect(setAgentMode('missing')).rejects.toEqual(
      expect.objectContaining<Partial<AgentAPIError>>({
        code: 'work_mode_not_found',
        message: 'work mode not found: missing',
        name: 'AgentAPIError',
        status: 404,
      }),
    )
  })
})
