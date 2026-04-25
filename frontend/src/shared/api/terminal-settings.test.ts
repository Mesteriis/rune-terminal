import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_TERMINAL_FONT_SIZE,
  DEFAULT_TERMINAL_LINE_HEIGHT,
  DEFAULT_TERMINAL_THEME_MODE,
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
              line_height: 1.4,
              theme_mode: 'contrast',
            },
          }),
        }),
    )

    await expect(requestTerminalSettings()).resolves.toEqual({
      font_size: 14,
      line_height: 1.4,
      theme_mode: 'contrast',
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
      line_height: DEFAULT_TERMINAL_LINE_HEIGHT,
      theme_mode: DEFAULT_TERMINAL_THEME_MODE,
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
            line_height: 1.45,
            theme_mode: 'contrast',
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      updateTerminalSettings({
        font_size: 99,
        line_height: 9,
        theme_mode: 'contrast',
      }),
    ).resolves.toEqual({
      font_size: 16,
      line_height: 1.45,
      theme_mode: 'contrast',
    })

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://127.0.0.1:8090/api/v1/settings/terminal',
      expect.objectContaining({
        body: JSON.stringify({
          font_size: 16,
          line_height: 1.6,
          theme_mode: 'contrast',
        }),
        method: 'PUT',
      }),
    )
  })
})
