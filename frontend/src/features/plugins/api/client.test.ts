import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import {
  deleteInstalledPlugin,
  disablePlugin,
  enablePlugin,
  fetchInstalledPlugins,
  installPlugin,
  PluginAPIError,
  updateInstalledPlugin,
} from './client'

afterEach(() => {
  resetRuntimeContextCacheForTests()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('plugin api client', () => {
  it('loads plugin catalog through the runtime transport', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/repo',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current_actor: {
            home_dir: '/Users/avm',
            username: 'avm',
          },
          plugins: [
            {
              access: {
                allowed_users: ['alice'],
                owner_username: 'avm',
                visibility: 'shared',
              },
              display_name: 'Ops Plugin',
              enabled: true,
              id: 'ops.plugin',
              installed_by: {
                username: 'avm',
              },
              metadata: {
                team: 'ops',
              },
              plugin_version: '1.0.0',
              protocol_version: 'rterm.plugin.v1',
              runtime_status: 'ready',
              source: {
                kind: 'git',
                ref: 'main',
                url: 'https://example.test/ops-plugin.git',
              },
              tools: [{ approval_tier: 'safe', name: 'plugin.ops_echo', target_kind: 'workspace' }],
              updated_by: {
                username: 'avm',
              },
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchInstalledPlugins()).resolves.toEqual({
      current_actor: {
        home_dir: '/Users/avm',
        username: 'avm',
      },
      plugins: [
        {
          access: {
            allowed_users: ['alice'],
            owner_username: 'avm',
            visibility: 'shared',
          },
          capabilities: [],
          created_at: undefined,
          description: undefined,
          display_name: 'Ops Plugin',
          enabled: true,
          id: 'ops.plugin',
          installed_by: {
            home_dir: undefined,
            username: 'avm',
          },
          metadata: {
            team: 'ops',
          },
          plugin_version: '1.0.0',
          protocol_version: 'rterm.plugin.v1',
          runtime_error: undefined,
          runtime_status: 'ready',
          source: {
            kind: 'git',
            ref: 'main',
            url: 'https://example.test/ops-plugin.git',
          },
          tools: [
            {
              approval_tier: 'safe',
              capabilities: [],
              description: undefined,
              name: 'plugin.ops_echo',
              target_kind: 'workspace',
            },
          ],
          updated_at: undefined,
          updated_by: {
            home_dir: undefined,
            username: 'avm',
          },
        },
      ],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/plugins')
  })

  it('installs plugins through the runtime transport', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/repo',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plugin: {
            access: {
              owner_username: 'avm',
              visibility: 'private',
            },
            display_name: 'Zip Plugin',
            enabled: true,
            id: 'zip.plugin',
            installed_by: {
              username: 'avm',
            },
            metadata: {
              team: 'ops',
            },
            plugin_version: '1.2.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: {
              kind: 'zip',
              url: 'file:///tmp/plugin.zip',
            },
            tools: [],
            updated_by: {
              username: 'avm',
            },
          },
          plugins: {
            current_actor: {
              username: 'avm',
            },
            plugins: [],
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      installPlugin({
        access: {
          allowed_users: ['alice', 'bob'],
          visibility: 'private',
        },
        metadata: {
          team: 'ops',
        },
        source: {
          kind: 'zip',
          url: ' file:///tmp/plugin.zip ',
        },
      }),
    ).resolves.toMatchObject({
      plugin: {
        id: 'zip.plugin',
        source: {
          kind: 'zip',
          url: 'file:///tmp/plugin.zip',
        },
      },
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/plugins/install')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({
        access: {
          allowed_users: ['alice', 'bob'],
          owner_username: '',
          visibility: 'private',
        },
        metadata: {
          team: 'ops',
        },
        source: {
          kind: 'zip',
          ref: undefined,
          url: 'file:///tmp/plugin.zip',
        },
      }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('mutates plugin lifecycle routes through the runtime transport', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/repo',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/repo',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plugin: {
            access: { owner_username: 'avm' },
            display_name: 'Ops Plugin',
            enabled: false,
            id: 'ops.plugin',
            installed_by: { username: 'avm' },
            plugin_version: '1.0.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'disabled',
            source: { kind: 'git', url: 'https://example.test/ops-plugin.git' },
            tools: [],
            updated_by: { username: 'avm' },
          },
          plugins: { current_actor: { username: 'avm' }, plugins: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plugin: {
            access: { owner_username: 'avm' },
            display_name: 'Ops Plugin',
            enabled: true,
            id: 'ops.plugin',
            installed_by: { username: 'avm' },
            plugin_version: '1.0.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: { kind: 'git', url: 'https://example.test/ops-plugin.git' },
            tools: [],
            updated_by: { username: 'avm' },
          },
          plugins: { current_actor: { username: 'avm' }, plugins: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plugin: {
            access: { owner_username: 'avm' },
            display_name: 'Ops Plugin',
            enabled: true,
            id: 'ops.plugin',
            installed_by: { username: 'avm' },
            plugin_version: '2.0.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: { kind: 'git', url: 'https://example.test/ops-plugin.git' },
            tools: [],
            updated_by: { username: 'avm' },
          },
          plugins: { current_actor: { username: 'avm' }, plugins: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          plugin: {
            access: { owner_username: 'avm' },
            display_name: 'Ops Plugin',
            enabled: true,
            id: 'ops.plugin',
            installed_by: { username: 'avm' },
            plugin_version: '2.0.0',
            protocol_version: 'rterm.plugin.v1',
            runtime_status: 'ready',
            source: { kind: 'git', url: 'https://example.test/ops-plugin.git' },
            tools: [],
            updated_by: { username: 'avm' },
          },
          plugins: { current_actor: { username: 'avm' }, plugins: [] },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await disablePlugin('ops.plugin')
    await enablePlugin('ops.plugin')
    await updateInstalledPlugin('ops.plugin')
    await deleteInstalledPlugin('ops.plugin')

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/plugins/ops.plugin/disable')
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://127.0.0.1:8090/api/v1/plugins/ops.plugin/enable')
    expect(fetchMock.mock.calls[3]?.[0]).toBe('http://127.0.0.1:8090/api/v1/plugins/ops.plugin/update')
    expect(fetchMock.mock.calls[4]?.[0]).toBe('http://127.0.0.1:8090/api/v1/plugins/ops.plugin')
    expect(fetchMock.mock.calls[4]?.[1]).toEqual({
      headers: {
        Authorization: 'Bearer runtime-token',
      },
      method: 'DELETE',
    })
  })

  it('surfaces backend error payloads', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/repo',
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          error: {
            code: 'invalid_plugin_install',
            message: 'zip source url is required',
          },
        }),
        ok: false,
        status: 400,
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      installPlugin({
        source: {
          kind: 'zip',
          url: '',
        },
      }),
    ).rejects.toEqual(new PluginAPIError(400, 'invalid_plugin_install', 'zip source url is required'))
  })
})
