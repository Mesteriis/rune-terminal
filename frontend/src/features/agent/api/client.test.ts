import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AgentAPIError,
  activateAgentConversation,
  archiveAgentConversation,
  createAgentAttachmentReference,
  createAgentConversation,
  deleteAgentConversation,
  executeAgentTool,
  explainTerminalCommand,
  fetchAgentCatalog,
  fetchAgentConversation,
  fetchAgentConversations,
  renameAgentConversation,
  restoreAgentConversation,
  sendAgentConversationMessage,
  setAgentMode,
  setAgentProfile,
  setAgentRole,
  streamAgentConversationMessage,
  updateAgentConversationContext,
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
            id: 'conv_1',
            context_preferences: {
              widget_context_enabled: true,
              widget_ids: ['term-main'],
            },
            title: 'Inspect backend contract',
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
            created_at: '2026-04-21T09:59:00Z',
            session: {
              id: 'session_1',
              provider_kind: 'stub',
            },
            updated_at: '2026-04-21T10:00:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentConversation()).resolves.toEqual({
      id: 'conv_1',
      title: 'Inspect backend contract',
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
      created_at: '2026-04-21T09:59:00Z',
      session: {
        id: 'session_1',
        provider_kind: 'stub',
      },
      context_preferences: {
        widget_context_enabled: true,
        widget_ids: ['term-main'],
      },
      updated_at: '2026-04-21T10:00:00Z',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversation')
  })

  it('updates conversation context preferences through the backend contract', async () => {
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
            id: 'conv_2',
            title: 'Current thread',
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            context_preferences: {
              widget_context_enabled: false,
              widget_ids: ['term-main', 'commander'],
            },
            created_at: '2026-04-21T10:00:00Z',
            updated_at: '2026-04-21T10:05:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      updateAgentConversationContext('conv_2', {
        widget_context_enabled: false,
        widget_ids: ['term-main', 'commander'],
      }),
    ).resolves.toMatchObject({
      id: 'conv_2',
      context_preferences: {
        widget_context_enabled: false,
        widget_ids: ['term-main', 'commander'],
      },
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversations/conv_2/context',
    )
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({
        widget_context_enabled: false,
        widget_ids: ['term-main', 'commander'],
      }),
    })
  })

  it('loads the conversation list and active conversation id from the backend contract', async () => {
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
          active_conversation_id: 'conv_2',
          counts: {
            recent: 1,
            archived: 1,
            all: 2,
          },
          conversations: [
            {
              id: 'conv_1',
              title: 'Earlier thread',
              created_at: '2026-04-21T09:00:00Z',
              updated_at: '2026-04-21T09:05:00Z',
              archived_at: '2026-04-21T09:06:00Z',
              message_count: 2,
            },
            {
              id: 'conv_2',
              title: 'Current thread',
              created_at: '2026-04-21T10:00:00Z',
              updated_at: '2026-04-21T10:01:00Z',
              message_count: 1,
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentConversations()).resolves.toEqual({
      active_conversation_id: 'conv_2',
      counts: {
        recent: 1,
        archived: 1,
        all: 2,
      },
      conversations: [
        {
          id: 'conv_1',
          title: 'Earlier thread',
          created_at: '2026-04-21T09:00:00Z',
          updated_at: '2026-04-21T09:05:00Z',
          archived_at: '2026-04-21T09:06:00Z',
          message_count: 2,
        },
        {
          id: 'conv_2',
          title: 'Current thread',
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:01:00Z',
          message_count: 1,
        },
      ],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversations')
  })

  it('passes conversation list filter params through the backend contract', async () => {
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
          active_conversation_id: 'conv_2',
          counts: {
            recent: 0,
            archived: 1,
            all: 1,
          },
          conversations: [],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentConversations({ query: 'terminal', scope: 'archived' })).resolves.toMatchObject({
      counts: {
        recent: 0,
        archived: 1,
        all: 1,
      },
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversations?query=terminal&scope=archived',
    )
  })

  it('creates and activates conversations through the backend contract', async () => {
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
            id: 'conv_2',
            title: 'New conversation',
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            created_at: '2026-04-21T10:00:00Z',
            updated_at: '2026-04-21T10:00:00Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            id: 'conv_1',
            title: 'Earlier thread',
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            created_at: '2026-04-21T09:00:00Z',
            updated_at: '2026-04-21T09:05:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(createAgentConversation()).resolves.toMatchObject({
      id: 'conv_2',
      title: 'New conversation',
    })
    await expect(activateAgentConversation('conv_1')).resolves.toMatchObject({
      id: 'conv_1',
      title: 'Earlier thread',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversations')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversations/conv_1/activate',
    )
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PUT' })
  })

  it('renames conversations through the backend contract', async () => {
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
            id: 'conv_1',
            title: 'Renamed thread',
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            created_at: '2026-04-21T10:00:00Z',
            updated_at: '2026-04-21T10:05:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(renameAgentConversation('conv_1', 'Renamed thread')).resolves.toMatchObject({
      id: 'conv_1',
      title: 'Renamed thread',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversations/conv_1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ title: 'Renamed thread' }),
    })
  })

  it('deletes conversations through the backend contract', async () => {
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
            id: 'conv_2',
            title: 'Replacement thread',
            messages: null,
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            created_at: '2026-04-21T10:10:00Z',
            updated_at: '2026-04-21T10:10:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteAgentConversation('conv_1')).resolves.toMatchObject({
      id: 'conv_2',
      title: 'Replacement thread',
      messages: [],
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversations/conv_1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'DELETE',
    })
  })

  it('archives and restores conversations through the backend contract', async () => {
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
            id: 'conv_2',
            title: 'Replacement thread',
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            created_at: '2026-04-21T10:10:00Z',
            updated_at: '2026-04-21T10:10:00Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            id: 'conv_1',
            title: 'Archived thread',
            messages: null,
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            created_at: '2026-04-21T10:00:00Z',
            updated_at: '2026-04-21T10:11:00Z',
            archived_at: '2026-04-21T10:11:00Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(archiveAgentConversation('conv_1')).resolves.toMatchObject({
      id: 'conv_2',
      title: 'Replacement thread',
    })
    await expect(restoreAgentConversation('conv_1')).resolves.toMatchObject({
      id: 'conv_1',
      title: 'Archived thread',
      archived_at: '2026-04-21T10:11:00Z',
      messages: [],
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversations/conv_1/archive',
    )
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT' })
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/agent/conversations/conv_1/restore',
    )
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PUT' })
  })

  it('posts tool execution requests and preserves approval responses from the backend', async () => {
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
        status: 428,
        json: async () => ({
          status: 'requires_confirmation',
          error_code: 'approval_required',
          pending_approval: {
            approval_tier: 'moderate',
            created_at: '2026-04-24T10:00:00Z',
            expires_at: '2026-04-24T10:05:00Z',
            id: 'approval_1',
            summary: 'send input to term-side: echo smoke',
            tool_name: 'term.send_input',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      executeAgentTool({
        context: {
          action_source: 'frontend.ai.sidebar.run',
          active_widget_id: 'term-side',
          repo_root: '/Users/avm/projects/runa-terminal',
          target_connection_id: 'local',
          target_session: 'local',
          widget_ids: ['term-side'],
        },
        input: {
          append_newline: true,
          text: 'echo smoke',
          widget_id: 'term-side',
        },
        tool_name: 'term.send_input',
      }),
    ).resolves.toMatchObject({
      error_code: 'approval_required',
      status: 'requires_confirmation',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/tools/execute')
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      context: {
        action_source: 'frontend.ai.sidebar.run',
        active_widget_id: 'term-side',
        repo_root: '/Users/avm/projects/runa-terminal',
        target_connection_id: 'local',
        target_session: 'local',
        widget_ids: ['term-side'],
      },
      input: {
        append_newline: true,
        text: 'echo smoke',
        widget_id: 'term-side',
      },
      tool_name: 'term.send_input',
    })
  })

  it('posts terminal explain requests to the backend contract', async () => {
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
          command_audit_event_id: 'audit_1',
          conversation: {
            messages: [],
            provider: {
              kind: 'codex',
              base_url: 'http://codex',
              model: 'gpt-5.4',
              streaming: false,
            },
            updated_at: '2026-04-24T10:00:00Z',
          },
          execution_block_id: 'exec_1',
          explain_audit_event_id: 'audit_2',
          output_excerpt: 'smoke',
          provider_error: '',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      explainTerminalCommand({
        command: 'echo smoke',
        context: {
          action_source: 'frontend.ai.sidebar.run',
          active_widget_id: 'term-side',
          repo_root: '/Users/avm/projects/runa-terminal',
          target_connection_id: 'local',
          target_session: 'local',
          widget_ids: ['term-side'],
          widget_context_enabled: true,
        },
        from_seq: 4,
        prompt: '/run echo smoke',
        widget_id: 'term-side',
      }),
    ).resolves.toMatchObject({
      command_audit_event_id: 'audit_1',
      execution_block_id: 'exec_1',
      output_excerpt: 'smoke',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/terminal-commands/explain')
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      command: 'echo smoke',
      context: {
        action_source: 'frontend.ai.sidebar.run',
        active_widget_id: 'term-side',
        repo_root: '/Users/avm/projects/runa-terminal',
        target_connection_id: 'local',
        target_session: 'local',
        widget_ids: ['term-side'],
        widget_context_enabled: true,
      },
      from_seq: 4,
      prompt: '/run echo smoke',
      widget_id: 'term-side',
    })
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
      model: 'gpt-5-mini',
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
        widget_ids: ['term-side', 'term-main'],
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
      model: 'gpt-5-mini',
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
        widget_ids: ['term-side', 'term-main'],
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
        model: 'gpt-5-mini',
        context: {
          action_source: 'frontend.ai.sidebar',
          active_widget_id: 'ai-shell-panel',
          repo_root: '/Users/avm/projects/runa-terminal',
          widget_ids: ['term-side', 'term-main'],
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
      model: 'gpt-5-mini',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_ids: ['term-side', 'term-main'],
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
