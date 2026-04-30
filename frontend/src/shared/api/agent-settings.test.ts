import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  clampAgentComposerSubmitMode,
  DEFAULT_AGENT_COMPOSER_SUBMIT_MODE,
  requestAgentSettings,
  updateAgentSettings,
} from '@/shared/api/agent-settings'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'

describe('agent settings api', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
  })

  it('clamps unknown submit modes to enter-sends', () => {
    expect(clampAgentComposerSubmitMode('mod-enter-sends')).toBe('mod-enter-sends')
    expect(clampAgentComposerSubmitMode('bogus')).toBe(DEFAULT_AGENT_COMPOSER_SUBMIT_MODE)
    expect(clampAgentComposerSubmitMode(null)).toBe(DEFAULT_AGENT_COMPOSER_SUBMIT_MODE)
  })

  it('loads agent settings from the backend runtime contract', async () => {
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
              composer_submit_mode: 'mod-enter-sends',
              debug_mode_enabled: true,
            },
          }),
        }),
    )

    await expect(requestAgentSettings()).resolves.toEqual({
      composer_submit_mode: 'mod-enter-sends',
      debug_mode_enabled: true,
    })
  })

  it('updates agent settings through the backend runtime contract', async () => {
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
            composer_submit_mode: 'enter-sends',
            debug_mode_enabled: true,
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      updateAgentSettings({
        composer_submit_mode: 'bogus' as never,
        debug_mode_enabled: true,
      }),
    ).resolves.toEqual({
      composer_submit_mode: 'enter-sends',
      debug_mode_enabled: true,
    })

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://127.0.0.1:8090/api/v1/settings/agent',
      expect.objectContaining({
        body: JSON.stringify({
          composer_submit_mode: 'enter-sends',
          debug_mode_enabled: true,
        }),
        method: 'PUT',
      }),
    )
  })
})
