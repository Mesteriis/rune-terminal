import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  controlMCPServer,
  deleteMCPServer,
  fetchMCPServerDetails,
  fetchMCPServers,
  registerRemoteMCPServer,
  updateRemoteMCPServer,
} from '@/features/mcp/api/client'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

describe('mcp client', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads servers from the backend MCP contract', async () => {
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
          servers: [
            {
              active: false,
              enabled: true,
              id: 'mcp.context7',
              endpoint: 'https://mcp.context7.com/mcp',
              state: 'stopped',
              type: 'remote',
            },
          ],
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMCPServers()).resolves.toEqual([
      {
        active: false,
        enabled: true,
        id: 'mcp.context7',
        endpoint: 'https://mcp.context7.com/mcp',
        state: 'stopped',
        type: 'remote',
      },
    ])
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/mcp/servers')
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer runtime-token',
    })
  })

  it('registers remote MCP servers with optional headers', async () => {
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
          server: {
            active: false,
            enabled: true,
            id: 'mcp.context7',
            endpoint: 'https://mcp.context7.com/mcp',
            state: 'stopped',
            type: 'remote',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      registerRemoteMCPServer({
        endpoint: ' https://mcp.context7.com/mcp ',
        headers: { Authorization: 'Bearer mcp-token' },
        id: ' mcp.context7 ',
      }),
    ).resolves.toMatchObject({
      id: 'mcp.context7',
      endpoint: 'https://mcp.context7.com/mcp',
      state: 'stopped',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/mcp/servers')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({
      endpoint: 'https://mcp.context7.com/mcp',
      headers: { Authorization: 'Bearer mcp-token' },
      id: 'mcp.context7',
      type: 'remote',
    })
  })

  it('routes lifecycle actions to the server control endpoint', async () => {
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
          server: {
            active: true,
            enabled: true,
            id: 'mcp.context7',
            endpoint: 'https://mcp.context7.com/mcp',
            state: 'idle',
            type: 'remote',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(controlMCPServer('mcp.context7', 'start')).resolves.toMatchObject({
      active: true,
      id: 'mcp.context7',
      state: 'idle',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/mcp/servers/mcp.context7/start')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST')
  })

  it('loads MCP server details with persisted headers', async () => {
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
          server: {
            active: false,
            enabled: true,
            endpoint: 'https://mcp.context7.com/mcp',
            headers: {
              Authorization: 'Bearer test-token',
            },
            id: 'mcp.context7',
            state: 'stopped',
            type: 'remote',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchMCPServerDetails('mcp.context7')).resolves.toEqual({
      active: false,
      enabled: true,
      endpoint: 'https://mcp.context7.com/mcp',
      headers: {
        Authorization: 'Bearer test-token',
      },
      id: 'mcp.context7',
      state: 'stopped',
      type: 'remote',
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/mcp/servers/mcp.context7')
  })

  it('updates remote MCP servers through the detail endpoint', async () => {
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
          server: {
            active: false,
            enabled: true,
            endpoint: 'https://mcp.context7.com/v2',
            id: 'mcp.context7',
            state: 'stopped',
            type: 'remote',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      updateRemoteMCPServer('mcp.context7', {
        endpoint: ' https://mcp.context7.com/v2 ',
        headers: { Authorization: 'Bearer new-token' },
        id: ' mcp.context7 ',
      }),
    ).resolves.toMatchObject({
      endpoint: 'https://mcp.context7.com/v2',
      id: 'mcp.context7',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/mcp/servers/mcp.context7')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('PUT')
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({
      endpoint: 'https://mcp.context7.com/v2',
      headers: { Authorization: 'Bearer new-token' },
      id: 'mcp.context7',
      type: 'remote',
    })
  })

  it('deletes remote MCP servers through the detail endpoint', async () => {
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
          server_id: 'mcp.context7',
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteMCPServer('mcp.context7')).resolves.toBe('mcp.context7')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://127.0.0.1:8090/api/v1/mcp/servers/mcp.context7')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('DELETE')
  })

  it('surfaces backend MCP errors with status and code', async () => {
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
        status: 409,
        json: async () => ({
          error: {
            code: 'mcp_server_registered',
            message: 'mcp server already registered',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      registerRemoteMCPServer({
        endpoint: 'https://mcp.context7.com/mcp',
        id: 'mcp.context7',
      }),
    ).rejects.toMatchObject({
      code: 'mcp_server_registered',
      status: 409,
    })
  })
})
