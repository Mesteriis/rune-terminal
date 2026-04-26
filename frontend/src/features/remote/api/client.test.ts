import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import {
  deleteRemoteProfile,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  RemoteAPIError,
  saveRemoteProfile,
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
            name: 'Prod',
            port: 2222,
            user: 'deploy',
          },
          profiles: [
            {
              host: 'prod.example.com',
              id: 'conn-prod',
              identity_file: '~/.ssh/id_prod',
              name: 'Prod',
              port: 2222,
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
        name: ' Prod ',
        port: 2222,
        user: ' deploy ',
      }),
    ).resolves.toEqual({
      profile: {
        host: 'prod.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod',
        name: 'Prod',
        port: 2222,
        user: 'deploy',
      },
      profiles: [
        {
          host: 'prod.example.com',
          id: 'conn-prod',
          identity_file: '~/.ssh/id_prod',
          name: 'Prod',
          port: 2222,
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
        name: 'Prod',
        port: 2222,
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
