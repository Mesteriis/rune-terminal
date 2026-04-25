import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_TERMINAL_FONT_SIZE,
  requestTerminalSettings,
  updateTerminalSettings,
} from '@/shared/api/terminal-settings'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

describe('terminal settings api', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
  })

  it('loads terminal settings from the backend runtime contract', async () => {
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
            settings: {
              font_size: 14,
            },
          }),
        }),
    )

    await expect(requestTerminalSettings()).resolves.toEqual({
      font_size: 14,
    })
  })

  it('normalizes empty terminal settings payloads to defaults', async () => {
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
            settings: null,
          }),
        }),
    )

    await expect(requestTerminalSettings()).resolves.toEqual({
      font_size: DEFAULT_TERMINAL_FONT_SIZE,
    })
  })

  it('updates terminal settings through the backend runtime contract', async () => {
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
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
          settings: {
            font_size: 16,
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      updateTerminalSettings({
        font_size: 99,
      }),
    ).resolves.toEqual({
      font_size: 16,
    })

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://127.0.0.1:8090/api/v1/settings/terminal',
      expect.objectContaining({
        body: JSON.stringify({
          font_size: 16,
        }),
        method: 'PUT',
      }),
    )
  })
})
