import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import {
  WorkspaceAPIError,
  closeWorkspaceWidget,
  fetchWorkspaceSnapshot,
  fetchWorkspaceWidgetKindCatalog,
  openDirectoryWorkspaceWidget,
} from '@/shared/api/workspace'

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

describe('fetchWorkspaceWidgetKindCatalog', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads the backend-owned widget kind catalog through the runtime transport', async () => {
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
          widget_kinds: [
            {
              kind: 'terminal',
              label: 'Terminal',
              description: 'Backend-owned terminal',
              status: 'available',
              runtime_owned: true,
              can_create: true,
              supports_connections: true,
              supports_path: false,
              default_title: 'Terminal',
              create_route: '/api/v1/workspace/tabs',
            },
            {
              kind: 'commander',
              label: 'Commander',
              description: 'Frontend-local commander',
              status: 'frontend-local',
              runtime_owned: false,
              can_create: false,
              supports_connections: false,
              supports_path: false,
              default_title: 'Commander',
              notes: 'not backend-owned yet',
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchWorkspaceWidgetKindCatalog()).resolves.toEqual([
      {
        kind: 'terminal',
        label: 'Terminal',
        description: 'Backend-owned terminal',
        status: 'available',
        runtime_owned: true,
        can_create: true,
        supports_connections: true,
        supports_path: false,
        default_title: 'Terminal',
        create_route: '/api/v1/workspace/tabs',
      },
      {
        kind: 'commander',
        label: 'Commander',
        description: 'Frontend-local commander',
        status: 'frontend-local',
        runtime_owned: false,
        can_create: false,
        supports_connections: false,
        supports_path: false,
        default_title: 'Commander',
        notes: 'not backend-owned yet',
      },
    ])
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/workspace/widget-kinds')
  })

  it('surfaces typed widget catalog errors', async () => {
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
        status: 503,
        json: async () => ({
          error: {
            code: 'catalog_unavailable',
            message: 'catalog unavailable',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchWorkspaceWidgetKindCatalog()).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceAPIError>>({
        code: 'catalog_unavailable',
        message: 'catalog unavailable',
        name: 'WorkspaceAPIError',
        status: 503,
      }),
    )
  })
})

describe('openDirectoryWorkspaceWidget', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('opens a directory widget through the backend workspace path-handoff route', async () => {
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
          tab_id: 'tab-main',
          widget_id: 'files-1',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      openDirectoryWorkspaceWidget({
        path: '/Users/avm/projects/runa-terminal',
        targetWidgetId: 'term-main',
      }),
    ).resolves.toEqual({
      tab_id: 'tab-main',
      widget_id: 'files-1',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/workspace/widgets/open-directory')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({
        connection_id: undefined,
        path: '/Users/avm/projects/runa-terminal',
        target_widget_id: 'term-main',
      }),
      method: 'POST',
    })
  })

  it('surfaces typed open-directory errors', async () => {
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
        status: 404,
        json: async () => ({
          error: {
            code: 'target_missing',
            message: 'target missing',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      openDirectoryWorkspaceWidget({
        path: '/Users/avm/projects/runa-terminal',
        targetWidgetId: 'missing',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceAPIError>>({
        code: 'target_missing',
        message: 'target missing',
        name: 'WorkspaceAPIError',
        status: 404,
      }),
    )
  })
})

describe('closeWorkspaceWidget', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('closes a backend-owned workspace widget through the runtime transport', async () => {
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
          closed_widget_id: 'files-1',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(closeWorkspaceWidget('files-1')).resolves.toEqual({
      closed_widget_id: 'files-1',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/workspace/widgets/files-1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'DELETE',
    })
  })

  it('surfaces typed close-widget errors', async () => {
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
        status: 404,
        json: async () => ({
          error: {
            code: 'workspace_widget_not_found',
            message: 'widget not found',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(closeWorkspaceWidget('missing')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceAPIError>>({
        code: 'workspace_widget_not_found',
        message: 'widget not found',
        name: 'WorkspaceAPIError',
        status: 404,
      }),
    )
  })
})
