import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { PreviewAPIError, openPreviewPathExternally, readPreviewFile } from './client'

afterEach(() => {
  resetRuntimeContextCacheForTests()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('readPreviewFile', () => {
  it('loads a bounded preview through the runtime transport', async () => {
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
          preview: '# Readme',
          preview_available: true,
          preview_bytes: 8,
          preview_kind: 'text',
          size_bytes: 8,
          truncated: false,
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(readPreviewFile('/repo/README.md', { maxBytes: 4096 })).resolves.toEqual({
      content: '# Readme',
      path: '/repo/README.md',
      previewBytes: 8,
      previewKind: 'text',
      sizeBytes: 8,
      truncated: false,
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://127.0.0.1:8090/api/v1/fs/read?path=%2Frepo%2FREADME.md&max_bytes=4096',
    )
  })

  it('surfaces typed preview errors', async () => {
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
            code: 'invalid_fs_path',
            message: 'invalid path',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(readPreviewFile('/repo')).rejects.toEqual(
      expect.objectContaining<Partial<PreviewAPIError>>({
        code: 'invalid_fs_path',
        message: 'invalid path',
        name: 'PreviewAPIError',
        status: 400,
      }),
    )
  })
})

describe('openPreviewPathExternally', () => {
  it('opens a preview path through the runtime external opener route', async () => {
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

    await expect(openPreviewPathExternally('/repo/README.md')).resolves.toEqual({
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
})
