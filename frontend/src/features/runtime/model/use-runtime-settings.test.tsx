import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useRuntimeSettings } from '@/features/runtime/model/use-runtime-settings'
import {
  canUpdateRuntimeSettings,
  requestRuntimeSettings,
  resolveRuntimeContext,
  setRuntimeWatcherMode,
} from '@/shared/api/runtime'

vi.mock('@/shared/api/runtime', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/runtime')>('@/shared/api/runtime')

  return {
    ...actual,
    canUpdateRuntimeSettings: vi.fn(),
    requestRuntimeSettings: vi.fn(),
    resolveRuntimeContext: vi.fn(),
    setRuntimeWatcherMode: vi.fn(),
  }
})

describe('useRuntimeSettings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads runtime bootstrap metadata and normalizes watcher mode', async () => {
    vi.mocked(canUpdateRuntimeSettings).mockReturnValue(false)
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      authToken: 'token',
      baseUrl: 'http://127.0.0.1:38092',
      colorTerm: 'truecolor',
      defaultShell: '/bin/zsh',
      homeDir: '/Users/avm',
      repoRoot: '/Users/avm/projects/Personal/tideterm/runa-terminal',
      term: 'xterm-256color',
    })
    vi.mocked(requestRuntimeSettings).mockResolvedValue({
      watcher_mode: 'persistent',
    })

    const { result } = renderHook(() => useRuntimeSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.canPersistWatcherMode).toBe(false)
    expect(result.current.watcherMode).toBe('persistent')
    expect(result.current.runtimeContext).toMatchObject({
      baseUrl: 'http://127.0.0.1:38092',
      colorTerm: 'truecolor',
      defaultShell: '/bin/zsh',
      homeDir: '/Users/avm',
      repoRoot: '/Users/avm/projects/Personal/tideterm/runa-terminal',
      term: 'xterm-256color',
    })
  })

  it('updates watcher mode through the desktop runtime contract', async () => {
    vi.mocked(canUpdateRuntimeSettings).mockReturnValue(true)
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      authToken: 'token',
      baseUrl: 'http://127.0.0.1:38092',
      colorTerm: 'truecolor',
      defaultShell: '/bin/zsh',
      homeDir: '/Users/avm',
      repoRoot: '/Users/avm/projects/Personal/tideterm/runa-terminal',
      term: 'xterm-256color',
    })
    vi.mocked(requestRuntimeSettings)
      .mockResolvedValueOnce({
        watcher_mode: 'ephemeral',
      })
      .mockResolvedValueOnce({
        watcher_mode: 'persistent',
      })

    const { result } = renderHook(() => useRuntimeSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateWatcherMode('persistent')
    })

    expect(setRuntimeWatcherMode).toHaveBeenCalledWith('persistent')
    expect(result.current.watcherMode).toBe('persistent')
  })
})
