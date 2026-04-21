import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchAgentProviderCatalog, updateAgentProvider } from '@/features/agent/api/provider-client'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

describe('agent provider client', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads the provider catalog from the backend contract', async () => {
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
              id: 'ollama-local',
              kind: 'ollama',
              display_name: 'Local Ollama',
              enabled: true,
              active: true,
              ollama: {
                base_url: 'http://127.0.0.1:11434/v1',
              },
              created_at: '2026-04-21T10:00:00Z',
              updated_at: '2026-04-21T10:00:00Z',
            },
          ],
          active_provider_id: 'ollama-local',
          supported_kinds: ['ollama', 'codex', 'openai', 'proxy'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAgentProviderCatalog()).resolves.toEqual({
      providers: [
        {
          id: 'ollama-local',
          kind: 'ollama',
          display_name: 'Local Ollama',
          enabled: true,
          active: true,
          ollama: {
            base_url: 'http://127.0.0.1:11434/v1',
          },
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:00:00Z',
        },
      ],
      active_provider_id: 'ollama-local',
      supported_kinds: ['ollama', 'codex', 'openai', 'proxy'],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers')
  })

  it('patches provider settings through the provider route', async () => {
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
            kind: 'proxy',
            display_name: 'Proxy',
            enabled: true,
            active: false,
            proxy: {
              model: 'assistant-default',
              channels: [
                {
                  id: 'codex-primary',
                  name: 'Codex EU',
                  service_type: 'openai',
                  base_url: 'https://example.eu/v1',
                  key_count: 1,
                  enabled_key_count: 1,
                },
              ],
            },
            created_at: '2026-04-21T10:00:00Z',
            updated_at: '2026-04-21T11:00:00Z',
          },
          providers: {
            providers: [],
            active_provider_id: 'ollama-local',
            supported_kinds: ['ollama', 'codex', 'openai', 'proxy'],
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await updateAgentProvider('provider-1', {
      proxy: {
        channels: [
          {
            id: 'codex-primary',
            name: 'Codex EU',
            service_type: 'openai',
            base_url: 'https://example.eu/v1',
          },
        ],
      },
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/providers/provider-1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PATCH',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      proxy: {
        channels: [
          {
            id: 'codex-primary',
            name: 'Codex EU',
            service_type: 'openai',
            base_url: 'https://example.eu/v1',
          },
        ],
      },
    })
  })
})
