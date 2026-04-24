import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { WorkspaceAPIError, fetchWorkspaceSnapshot } from '@/shared/api/workspace'

describe('fetchWorkspaceSnapshot', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads the backend workspace snapshot through the runtime transport', async () => {
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
          id: 'ws-local',
          name: 'Local Workspace',
          active_widget_id: 'term-side',
          widgets: [
            {
              id: 'term-main',
              kind: 'terminal',
              title: 'Main Shell',
              connection_id: 'local',
            },
            {
              id: 'term-side',
              kind: 'terminal',
              title: 'Ops Shell',
              connection_id: 'local',
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchWorkspaceSnapshot()).resolves.toEqual({
      id: 'ws-local',
      name: 'Local Workspace',
      active_widget_id: 'term-side',
      widgets: [
        {
          id: 'term-main',
          kind: 'terminal',
          title: 'Main Shell',
          connection_id: 'local',
        },
        {
          id: 'term-side',
          kind: 'terminal',
          title: 'Ops Shell',
          connection_id: 'local',
        },
      ],
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/workspace')
  })

  it('surfaces typed workspace errors', async () => {
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
        status: 500,
        json: async () => ({
          error: {
            code: 'workspace_unavailable',
            message: 'workspace unavailable',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchWorkspaceSnapshot()).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceAPIError>>({
        code: 'workspace_unavailable',
        message: 'workspace unavailable',
        name: 'WorkspaceAPIError',
        status: 500,
      }),
    )
  })
})
