import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  discoverAgentProviderModels,
  fetchAgentProviderCatalog,
  fetchAgentProviderGatewaySnapshot,
  probeAgentProvider,
  updateAgentProvider,
} from '@/features/agent/api/provider-client'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

describe('agent provider client', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads the CLI provider catalog from the backend contract', async () => {
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
          providers: [
            {
              id: 'codex-cli',
              kind: 'codex',
              display_name: 'Codex CLI',
              enabled: true,
              active: true,
              codex: {
                command: 'codex',
                model: 'gpt-5.4',
                chat_models: ['gpt-5.4'],
              },
              created_at: '2026-04-21T10:00:00Z',
              updated_at: '2026-04-21T10:00:00Z',
            },
          ],
          active_provider_id: 'codex-cli',
          supported_kinds: ['codex', 'claude', 'openai-compatible'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentProviderCatalog()).resolves.toEqual({
      providers: [
        {
          id: 'codex-cli',
          kind: 'codex',
          display_name: 'Codex CLI',
          enabled: true,
          active: true,
          codex: {
            command: 'codex',
            model: 'gpt-5.4',
            chat_models: ['gpt-5.4'],
          },
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:00:00Z',
        },
      ],
      active_provider_id: 'codex-cli',
      supported_kinds: ['codex', 'claude', 'openai-compatible'],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers')
  })

  it('loads provider gateway telemetry from the backend contract', async () => {
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
          generated_at: '2026-04-26T10:20:00Z',
          providers: [
            {
              provider_id: 'codex-cli',
              provider_kind: 'codex',
              display_name: 'Codex CLI',
              enabled: true,
              active: true,
              route_ready: true,
              route_status_state: 'ready',
              route_status_message: 'Codex CLI is authenticated.',
              resolved_binary: '/usr/local/bin/codex',
              model: 'gpt-5.4',
              route_checked_at: '2026-04-26T10:18:30Z',
              route_latency_ms: 42,
              total_runs: 4,
              succeeded_runs: 3,
              failed_runs: 1,
              cancelled_runs: 0,
              average_duration_ms: 420,
              last_duration_ms: 380,
              last_status: 'succeeded',
              last_started_at: '2026-04-26T10:19:00Z',
              last_completed_at: '2026-04-26T10:19:00.380Z',
            },
          ],
          recent_runs: [
            {
              id: 'provider-run-1',
              provider_id: 'codex-cli',
              provider_kind: 'codex',
              provider_display_name: 'Codex CLI',
              request_mode: 'stream',
              model: 'gpt-5.4',
              conversation_id: 'conv-1',
              status: 'succeeded',
              duration_ms: 380,
              started_at: '2026-04-26T10:19:00Z',
              completed_at: '2026-04-26T10:19:00.380Z',
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentProviderGatewaySnapshot()).resolves.toEqual({
      generated_at: '2026-04-26T10:20:00Z',
      providers: [
        {
          provider_id: 'codex-cli',
          provider_kind: 'codex',
          display_name: 'Codex CLI',
          enabled: true,
          active: true,
          route_ready: true,
          route_status_state: 'ready',
          route_status_message: 'Codex CLI is authenticated.',
          resolved_binary: '/usr/local/bin/codex',
          model: 'gpt-5.4',
          route_checked_at: '2026-04-26T10:18:30Z',
          route_latency_ms: 42,
          total_runs: 4,
          succeeded_runs: 3,
          failed_runs: 1,
          cancelled_runs: 0,
          average_duration_ms: 420,
          last_duration_ms: 380,
          last_status: 'succeeded',
          last_started_at: '2026-04-26T10:19:00Z',
          last_completed_at: '2026-04-26T10:19:00.380Z',
        },
      ],
      recent_runs: [
        {
          id: 'provider-run-1',
          provider_id: 'codex-cli',
          provider_kind: 'codex',
          provider_display_name: 'Codex CLI',
          request_mode: 'stream',
          model: 'gpt-5.4',
          conversation_id: 'conv-1',
          status: 'succeeded',
          duration_ms: 380,
          started_at: '2026-04-26T10:19:00Z',
          completed_at: '2026-04-26T10:19:00.380Z',
        },
      ],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers/gateway')
  })

  it('probes one provider through the backend contract', async () => {
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
          provider_id: 'provider-1',
          provider_kind: 'openai-compatible',
          display_name: 'LAN Source',
          ready: true,
          status_state: 'ready',
          status_message: 'Source is reachable with 2 discovered model(s).',
          base_url: 'http://127.0.0.1:8317',
          model: 'gpt-5.4',
          discovered_models: ['gpt-5.4', 'gpt-5.4-mini'],
          latency_ms: 52,
          checked_at: '2026-04-26T11:00:00Z',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(probeAgentProvider('provider-1')).resolves.toEqual({
      provider_id: 'provider-1',
      provider_kind: 'openai-compatible',
      display_name: 'LAN Source',
      ready: true,
      status_state: 'ready',
      status_message: 'Source is reachable with 2 discovered model(s).',
      base_url: 'http://127.0.0.1:8317',
      model: 'gpt-5.4',
      discovered_models: ['gpt-5.4', 'gpt-5.4-mini'],
      latency_ms: 52,
      checked_at: '2026-04-26T11:00:00Z',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers/provider-1/probe')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
    })
  })

  it('normalizes openai-compatible providers from the backend catalog', async () => {
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
          providers: [
            {
              id: 'http-source',
              kind: 'openai-compatible',
              display_name: 'LAN Source',
              enabled: true,
              active: false,
              openai_compatible: {
                base_url: 'http://192.168.1.8:8317',
                model: 'gpt-5.4',
                chat_models: null,
              },
              created_at: '2026-04-24T10:00:00Z',
              updated_at: '2026-04-24T10:00:00Z',
            },
          ],
          active_provider_id: 'codex-cli',
          supported_kinds: ['codex', 'claude', 'openai-compatible'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentProviderCatalog()).resolves.toEqual({
      providers: [
        {
          id: 'http-source',
          kind: 'openai-compatible',
          display_name: 'LAN Source',
          enabled: true,
          active: false,
          openai_compatible: {
            base_url: 'http://192.168.1.8:8317',
            model: 'gpt-5.4',
            chat_models: [],
          },
          created_at: '2026-04-24T10:00:00Z',
          updated_at: '2026-04-24T10:00:00Z',
        },
      ],
      active_provider_id: 'codex-cli',
      supported_kinds: ['codex', 'claude', 'openai-compatible'],
    })
  })

  it('normalizes null model arrays from the backend provider catalog', async () => {
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
          providers: [
            {
              id: 'claude-code-cli',
              kind: 'claude',
              display_name: 'Claude Code CLI',
              enabled: true,
              active: true,
              claude: {
                command: 'claude',
                model: 'sonnet',
                chat_models: null,
              },
              created_at: '2026-04-21T10:00:00Z',
              updated_at: '2026-04-21T10:00:00Z',
            },
          ],
          active_provider_id: 'claude-code-cli',
          supported_kinds: null,
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentProviderCatalog()).resolves.toEqual({
      providers: [
        {
          id: 'claude-code-cli',
          kind: 'claude',
          display_name: 'Claude Code CLI',
          enabled: true,
          active: true,
          claude: {
            command: 'claude',
            model: 'sonnet',
            chat_models: [],
          },
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:00:00Z',
        },
      ],
      active_provider_id: 'claude-code-cli',
      supported_kinds: [],
    })
  })

  it('patches CLI provider settings through the provider route', async () => {
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
          provider: {
            id: 'provider-1',
            kind: 'claude',
            display_name: 'Claude Code CLI',
            enabled: true,
            active: false,
            claude: {
              command: 'claude',
              model: 'sonnet',
              chat_models: ['sonnet', 'opus'],
            },
            created_at: '2026-04-21T10:00:00Z',
            updated_at: '2026-04-21T11:00:00Z',
          },
          providers: {
            providers: [],
            active_provider_id: 'codex-cli',
            supported_kinds: ['codex', 'claude'],
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await updateAgentProvider('provider-1', {
      claude: {
        chat_models: ['sonnet', 'opus'],
      },
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers/provider-1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PATCH',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      claude: {
        chat_models: ['sonnet', 'opus'],
      },
    })
  })

  it('loads codex CLI models through the discovery route', async () => {
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
          models: ['gpt-5.4', 'gpt-5-codex'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverAgentProviderModels({
        kind: 'codex',
        codex: {
          command: 'codex',
          model: 'gpt-5.4',
        },
      }),
    ).resolves.toEqual({
      models: ['gpt-5.4', 'gpt-5-codex'],
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers/models')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      kind: 'codex',
      codex: {
        command: 'codex',
        model: 'gpt-5.4',
      },
    })
  })

  it('loads claude CLI models through the discovery route', async () => {
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
          models: ['sonnet', 'opus'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverAgentProviderModels({
        kind: 'claude',
        claude: {
          command: 'claude',
          model: 'sonnet',
        },
      }),
    ).resolves.toEqual({
      models: ['sonnet', 'opus'],
    })

    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      kind: 'claude',
      claude: {
        command: 'claude',
        model: 'sonnet',
      },
    })
  })

  it('loads openai-compatible models through the discovery route', async () => {
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
          models: ['gpt-5.4', 'claude-sonnet-4-6', 'gemini-3-pro-low'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverAgentProviderModels({
        kind: 'openai-compatible',
        openai_compatible: {
          base_url: 'http://192.168.1.8:8317',
          model: 'gpt-5.4',
        },
      }),
    ).resolves.toEqual({
      models: ['gpt-5.4', 'claude-sonnet-4-6', 'gemini-3-pro-low'],
    })

    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      kind: 'openai-compatible',
      openai_compatible: {
        base_url: 'http://192.168.1.8:8317',
        model: 'gpt-5.4',
      },
    })
  })

  it('normalizes null discovery model arrays from the backend', async () => {
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
          models: null,
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      discoverAgentProviderModels({
        kind: 'claude',
        claude: {
          command: 'claude',
          model: 'sonnet',
        },
      }),
    ).resolves.toEqual({
      models: [],
    })
  })
})
