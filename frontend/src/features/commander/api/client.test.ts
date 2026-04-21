import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CommanderAPIError,
  copyCommanderEntries,
  copyCommanderEntriesToPaths,
  deleteCommanderEntries,
  listCommanderDirectory,
  mkdirCommanderDirectory,
  moveCommanderEntries,
  readCommanderFile,
  readCommanderFilePreview,
  renameCommanderEntries,
  writeCommanderFile,
} from '@/features/commander/api/client'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

describe('commander api client', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('maps mkdir responses back into commander entry coordinates', async () => {
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
          ok: true,
          json: async () => ({
            path: '/Users/avm/projects/runa-terminal/tmp/new-folder',
          }),
        }),
    )

    await expect(
      mkdirCommanderDirectory('/Users/avm/projects/runa-terminal/tmp/new-folder'),
    ).resolves.toEqual({
      entryId: '/Users/avm/projects/runa-terminal/tmp::new-folder',
      entryName: 'new-folder',
      parentPath: '/Users/avm/projects/runa-terminal/tmp',
      path: '/Users/avm/projects/runa-terminal/tmp/new-folder',
    })
  })

  it('surfaces typed backend errors for mutation and read requests', async () => {
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
          status: 409,
          json: async () => ({
            error: {
              code: 'fs_path_exists',
              message: 'fs path already exists',
            },
          }),
        }),
    )

    await expect(mkdirCommanderDirectory('/Users/avm/projects/runa-terminal/tmp/new-folder')).rejects.toEqual(
      expect.objectContaining<Partial<CommanderAPIError>>({
        code: 'fs_path_exists',
        message: 'fs path already exists',
        name: 'CommanderAPIError',
        status: 409,
      }),
    )
  })

  it('reuses one runtime bootstrap across multiple commander requests', async () => {
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
          path: '/Users/avm/projects/runa-terminal',
          directories: [],
          files: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          path: '/Users/avm/projects/runa-terminal/README.md',
          preview: 'hello',
          preview_available: true,
          truncated: false,
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await listCommanderDirectory('/Users/avm/projects/runa-terminal')
    await readCommanderFilePreview('/Users/avm/projects/runa-terminal/README.md')

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('maps full file read and write responses into commander snapshots', async () => {
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
          path: '/Users/avm/projects/runa-terminal/README.md',
          content: 'full file',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          path: '/Users/avm/projects/runa-terminal/README.md',
          content: 'saved file',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(readCommanderFile('/Users/avm/projects/runa-terminal/README.md')).resolves.toEqual({
      content: 'full file',
      entryId: '/Users/avm/projects/runa-terminal::README.md',
      entryName: 'README.md',
      path: '/Users/avm/projects/runa-terminal',
    })
    await expect(
      writeCommanderFile('/Users/avm/projects/runa-terminal/README.md', 'saved file'),
    ).resolves.toEqual({
      content: 'saved file',
      entryId: '/Users/avm/projects/runa-terminal::README.md',
      entryName: 'README.md',
      path: '/Users/avm/projects/runa-terminal',
    })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/file')
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({
        content: 'saved file',
        path: '/Users/avm/projects/runa-terminal/README.md',
      }),
      method: 'PUT',
    })
  })

  it('posts typed backend mutation payloads for copy, move, delete, and rename', async () => {
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
          paths: ['/Users/avm/projects/runa-terminal/tmp/README.md'],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await copyCommanderEntries(
      ['/Users/avm/projects/runa-terminal/README.md'],
      '/Users/avm/projects/runa-terminal/tmp',
    )
    await copyCommanderEntriesToPaths([
      {
        source_path: '/Users/avm/projects/runa-terminal/README.md',
        target_path: '/Users/avm/projects/runa-terminal/tmp/README-copy.md',
      },
    ])
    await moveCommanderEntries(
      ['/Users/avm/projects/runa-terminal/README.md'],
      '/Users/avm/projects/runa-terminal/tmp',
      {
        overwrite: true,
      },
    )
    await deleteCommanderEntries(['/Users/avm/projects/runa-terminal/tmp/README.md'])
    await renameCommanderEntries([
      {
        path: '/Users/avm/projects/runa-terminal/tmp/README.md',
        next_name: 'README-copy.md',
      },
    ])

    expect(fetchMock).toHaveBeenCalledTimes(6)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/copy')
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/copy')
    expect(fetchMock.mock.calls[3]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/move')
    expect(fetchMock.mock.calls[4]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/delete')
    expect(fetchMock.mock.calls[5]?.[0]).toBe('http://127.0.0.1:8090/api/v1/fs/rename')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({
        overwrite: false,
        source_paths: ['/Users/avm/projects/runa-terminal/README.md'],
        target_path: '/Users/avm/projects/runa-terminal/tmp',
      }),
      method: 'POST',
    })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({
        entries: [
          {
            source_path: '/Users/avm/projects/runa-terminal/README.md',
            target_path: '/Users/avm/projects/runa-terminal/tmp/README-copy.md',
          },
        ],
        overwrite: false,
      }),
      method: 'POST',
    })
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      body: JSON.stringify({
        overwrite: true,
        source_paths: ['/Users/avm/projects/runa-terminal/README.md'],
        target_path: '/Users/avm/projects/runa-terminal/tmp',
      }),
      method: 'POST',
    })
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      body: JSON.stringify({
        paths: ['/Users/avm/projects/runa-terminal/tmp/README.md'],
      }),
      method: 'POST',
    })
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      body: JSON.stringify({
        entries: [
          {
            path: '/Users/avm/projects/runa-terminal/tmp/README.md',
            next_name: 'README-copy.md',
          },
        ],
        overwrite: false,
      }),
      method: 'POST',
    })
  })
})
