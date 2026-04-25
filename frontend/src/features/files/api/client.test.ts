import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { FilesAPIError, listFilesDirectory } from './client'

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
          id: '/repo::src',
          kind: 'directory',
          modified: '2023-11-14 22:13',
          name: 'src',
          sizeLabel: '',
        },
        {
          id: '/repo::README.md',
          kind: 'file',
          modified: '2023-11-14 22:14',
          name: 'README.md',
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
})
