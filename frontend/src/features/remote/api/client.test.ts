import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import {
  checkRemoteProfileConnection,
  createRemoteProfileSession,
  deleteRemoteProfile,
  fetchRemoteConnectionsSnapshot,
  fetchRemoteProfileTmuxSessions,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  RemoteAPIError,
  saveRemoteProfile,
  selectRemoteProfileConnection,
} from './client'

afterEach(() => {
  resetRuntimeContextCacheForTests()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('remote api client', () => {
  it('loads remote profiles through the runtime transport', async () => {
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
          profiles: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod', user: 'deploy' }],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRemoteProfiles()).resolves.toEqual([
      { host: 'prod.example.com', id: 'conn-prod', name: 'prod', user: 'deploy' },
    ])
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/remote/profiles')
  })

  it('imports ssh config profiles through the runtime transport', async () => {
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
          imported: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod' }],
          profiles: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod' }],
          skipped: [{ host: '*.internal', reason: 'unsupported_host_pattern' }],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(importSSHConfigProfiles('/Users/avm/.ssh/config')).resolves.toEqual({
      imported: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod' }],
      profiles: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod' }],
      skipped: [{ host: '*.internal', reason: 'unsupported_host_pattern' }],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/remote/profiles/import-ssh-config',
    )
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({ path: '/Users/avm/.ssh/config' }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('saves remote profiles through the runtime transport', async () => {
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
          profile: {
            host: 'prod.example.com',
            id: 'conn-prod',
            identity_file: '~/.ssh/id_prod',
            launch_mode: 'tmux',
            name: 'Prod',
            port: 2222,
            tmux_session: 'prod-main',
            user: 'deploy',
          },
          profiles: [
            {
              host: 'prod.example.com',
              id: 'conn-prod',
              identity_file: '~/.ssh/id_prod',
              launch_mode: 'tmux',
              name: 'Prod',
              port: 2222,
              tmux_session: 'prod-main',
              user: 'deploy',
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      saveRemoteProfile({
        host: ' prod.example.com ',
        identity_file: ' ~/.ssh/id_prod ',
        launch_mode: 'tmux',
        name: ' Prod ',
        port: 2222,
        tmux_session: ' prod-main ',
        user: ' deploy ',
      }),
    ).resolves.toEqual({
      profile: {
        host: 'prod.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod',
        launch_mode: 'tmux',
        name: 'Prod',
        port: 2222,
        tmux_session: 'prod-main',
        user: 'deploy',
      },
      profiles: [
        {
          host: 'prod.example.com',
          id: 'conn-prod',
          identity_file: '~/.ssh/id_prod',
          launch_mode: 'tmux',
          name: 'Prod',
          port: 2222,
          tmux_session: 'prod-main',
          user: 'deploy',
        },
      ],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/remote/profiles')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({
        host: 'prod.example.com',
        id: undefined,
        identity_file: '~/.ssh/id_prod',
        launch_mode: 'tmux',
        name: 'Prod',
        port: 2222,
        tmux_session: 'prod-main',
        user: 'deploy',
      }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('deletes remote profiles through the runtime transport', async () => {
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
          profiles: [],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteRemoteProfile('conn-prod')).resolves.toEqual({ profiles: [] })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/remote/profiles/conn-prod')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      headers: {
        Authorization: 'Bearer runtime-token',
      },
      method: 'DELETE',
    })
  })

  it('loads connection snapshot through the runtime transport', async () => {
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
          active_connection_id: 'conn-prod',
          connections: [
            {
              active: true,
              id: 'conn-prod',
              kind: 'ssh',
              name: 'Prod',
              runtime: {
                check_status: 'passed',
                launch_status: 'idle',
              },
              usability: 'available',
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRemoteConnectionsSnapshot()).resolves.toEqual({
      active_connection_id: 'conn-prod',
      connections: [
        {
          active: true,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'Prod',
          runtime: {
            check_status: 'passed',
            launch_status: 'idle',
          },
          usability: 'available',
        },
      ],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/connections')
  })

  it('checks a remote profile connection through the runtime transport', async () => {
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
          connection: {
            active: false,
            id: 'conn-prod',
            kind: 'ssh',
            name: 'Prod',
            runtime: {
              check_status: 'passed',
              launch_status: 'idle',
            },
            usability: 'available',
          },
          connections: {
            active_connection_id: 'local',
            connections: [],
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkRemoteProfileConnection('conn-prod')).resolves.toEqual({
      connection: {
        active: false,
        id: 'conn-prod',
        kind: 'ssh',
        name: 'Prod',
        runtime: {
          check_status: 'passed',
          launch_status: 'idle',
        },
        usability: 'available',
      },
      connections: {
        active_connection_id: 'local',
        connections: [],
      },
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/connections/conn-prod/check')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      headers: {
        Authorization: 'Bearer runtime-token',
      },
      method: 'POST',
    })
  })

  it('loads tmux sessions for a saved remote profile through the runtime transport', async () => {
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
          sessions: [
            { attached: true, name: 'prod-main', window_count: 2 },
            { attached: false, name: 'prod-jobs', window_count: 1 },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRemoteProfileTmuxSessions('conn-prod')).resolves.toEqual([
      { attached: true, name: 'prod-main', window_count: 2 },
      { attached: false, name: 'prod-jobs', window_count: 1 },
    ])
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/remote/profiles/conn-prod/tmux-sessions',
    )
  })

  it('starts a remote session from a saved profile through the runtime transport', async () => {
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
          connection_id: 'conn-prod',
          profile_id: 'conn-prod',
          remote_session_name: 'prod-jobs',
          reused: false,
          session_id: 'term-remote',
          tab_id: 'tab-remote',
          widget_id: 'term-remote',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createRemoteProfileSession('conn-prod', {
        title: 'Prod Shell',
        tmux_session: 'prod-jobs',
      }),
    ).resolves.toEqual({
      connection_id: 'conn-prod',
      profile_id: 'conn-prod',
      remote_session_name: 'prod-jobs',
      reused: false,
      session_id: 'term-remote',
      tab_id: 'tab-remote',
      widget_id: 'term-remote',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/remote/profiles/conn-prod/session',
    )
  })

  it('selects a remote profile as the default connection through the runtime transport', async () => {
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
          active_connection_id: 'conn-prod',
          connections: [],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(selectRemoteProfileConnection('conn-prod')).resolves.toEqual({
      active_connection_id: 'conn-prod',
      connections: [],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/connections/active')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({ connection_id: 'conn-prod' }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    })
  })

  it('surfaces typed remote errors', async () => {
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
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'invalid_connection_request',
            message: 'ssh config not found',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(importSSHConfigProfiles('/missing')).rejects.toEqual(
      expect.objectContaining<Partial<RemoteAPIError>>({
        code: 'invalid_connection_request',
        message: 'ssh config not found',
        name: 'RemoteAPIError',
        status: 400,
      }),
    )
  })
})
