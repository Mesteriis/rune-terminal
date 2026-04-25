import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  formatRuntimePathForDisplay,
  resetRuntimeContextCacheForTests,
  resolveRuntimeContext,
  resolveRuntimePathInput,
} from '@/shared/api/runtime'

describe('runtime path helpers', () => {
  it('formats paths relative to the home directory with ~', () => {
    expect(formatRuntimePathForDisplay('/Users/avm/projects/runa-terminal', { homeDir: '/Users/avm' })).toBe(
      '~/projects/runa-terminal',
    )
    expect(formatRuntimePathForDisplay('/Users/avm', { homeDir: '/Users/avm' })).toBe('~')
  })

  it('resolves ~ and relative path input against the current path', () => {
    expect(resolveRuntimePathInput('~/projects', { homeDir: '/Users/avm' }, '/Users/avm/work')).toBe(
      '/Users/avm/projects',
    )
    expect(
      resolveRuntimePathInput(
        '../docs',
        { homeDir: '/Users/avm' },
        '/Users/avm/projects/runa-terminal/frontend',
      ),
    ).toBe('/Users/avm/projects/runa-terminal/docs')
  })
})

describe('resolveRuntimeContext', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
  })

  it('loads runtime bootstrap from the env-configured backend', async () => {
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          color_term: 'truecolor',
          default_shell: '/bin/zsh',
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
          term: 'xterm-256color',
        }),
      }),
    )

    await expect(resolveRuntimeContext()).resolves.toEqual({
      authToken: 'runtime-token',
      baseUrl: 'http://127.0.0.1:8090',
      colorTerm: 'truecolor',
      defaultShell: '/bin/zsh',
      homeDir: '/Users/avm',
      repoRoot: '/Users/avm/projects/runa-terminal',
      term: 'xterm-256color',
    })
  })
})
