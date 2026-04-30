import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { FilesAPIError, listFilesDirectory, openFilesPathExternally } from './client'

afterEach(() => {
  resetRuntimeContextCacheForTests()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('listFilesDirectory', () => {
  it('loads and normalizes directory entries through the runtime transport', async () => {
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
          directories: [{ modified_time: 1_700_000_000, name: 'src', type: 'directory' }],
          files: [{ modified_time: 1_700_000_060, name: 'README.md', size: 2048, type: 'file' }],
          path: '/repo',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(listFilesDirectory('/repo')).resolves.toEqual({
      entries: [
        {
          hidden: false,
          id: '/repo::src',
          kind: 'directory',
          modified: '2023-11-14 22:13',
          modifiedTime: 1_700_000_000,
          name: 'src',
          sizeBytes: 0,
          sizeLabel: '',
        },
        {
          hidden: false,
          id: '/repo::README.md',
          kind: 'file',
          modified: '2023-11-14 22:14',
          modifiedTime: 1_700_000_060,
          name: 'README.md',
          sizeBytes: 2048,
          sizeLabel: '2.0 KB',
        },
      ],
      path: '/repo',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/list?path=%2Frepo')
  })

  it('surfaces typed files API errors', async () => {
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
        status: 403,
        json: async () => ({
          error: {
            code: 'policy_denied',
            message: 'policy denied',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(listFilesDirectory('/private')).rejects.toEqual(
      expect.objectContaining<Partial<FilesAPIError>>({
        code: 'policy_denied',
        message: 'policy denied',
        name: 'FilesAPIError',
        status: 403,
      }),
    )
  })

  it('includes connection scope for remote directory requests', async () => {
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
          directories: [],
          files: [],
          path: '/remote/project',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(listFilesDirectory('/remote/project', { connectionId: 'conn-ssh' })).resolves.toEqual({
      entries: [],
      path: '/remote/project',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/fs/list?path=%2Fremote%2Fproject&connection_id=conn-ssh',
    )
  })

  it('includes widget scope for backend-owned outside-root directory requests', async () => {
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
          directories: [],
          files: [],
          path: '/tmp/session',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(listFilesDirectory('/tmp/session', { widgetId: 'files-1' })).resolves.toEqual({
      entries: [],
      path: '/tmp/session',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/fs/list?path=%2Ftmp%2Fsession&widget_id=files-1',
    )
  })

  it('opens a path through the runtime external opener route', async () => {
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
          path: '/repo/README.md',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(openFilesPathExternally('/repo/README.md')).resolves.toEqual({
      path: '/repo/README.md',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/open')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({ path: '/repo/README.md' }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('includes connection scope when opening remote paths externally', async () => {
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
          path: '/remote/project/README.md',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      openFilesPathExternally('/remote/project/README.md', { connectionId: 'conn-ssh' }),
    ).resolves.toEqual({
      path: '/remote/project/README.md',
    })
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({ connection_id: 'conn-ssh', path: '/remote/project/README.md' }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('includes widget scope when opening backend-owned file paths externally', async () => {
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
          path: '/tmp/session/README.md',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(openFilesPathExternally('/tmp/session/README.md', { widgetId: 'files-1' })).resolves.toEqual(
      {
        path: '/tmp/session/README.md',
      },
    )
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      body: JSON.stringify({ path: '/tmp/session/README.md', widget_id: 'files-1' }),
      headers: {
        Authorization: 'Bearer runtime-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  })
})
