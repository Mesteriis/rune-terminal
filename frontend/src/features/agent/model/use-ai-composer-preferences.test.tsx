import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  resetAiComposerPreferencesForTests,
  useAiComposerPreferences,
} from '@/features/agent/model/use-ai-composer-preferences'
import { requestAgentSettings, updateAgentSettings } from '@/shared/api/agent-settings'

vi.mock('@/shared/api/agent-settings', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/agent-settings')>(
    '@/shared/api/agent-settings',
  )

  return {
    ...actual,
    requestAgentSettings: vi.fn(),
    updateAgentSettings: vi.fn(),
  }
})

describe('useAiComposerPreferences', () => {
  afterEach(() => {
    resetAiComposerPreferencesForTests()
    vi.clearAllMocks()
  })

  it('defaults to enter-sends while the runtime settings are loading', () => {
    vi.mocked(requestAgentSettings).mockImplementation(
      () =>
        new Promise(() => {
          // Keep the request pending to assert the initial loading snapshot.
        }),
    )

    const { result } = renderHook(() => useAiComposerPreferences())

    expect(result.current.submitMode).toBe('enter-sends')
    expect(result.current.isLoading).toBe(true)
  })

  it('hydrates submit mode from the runtime-backed settings contract', async () => {
    vi.mocked(requestAgentSettings).mockResolvedValue({
      composer_submit_mode: 'mod-enter-sends',
    })

    const { result } = renderHook(() => useAiComposerPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.submitMode).toBe('mod-enter-sends')
  })

  it('persists submit mode changes through the runtime-backed settings contract', async () => {
    vi.mocked(requestAgentSettings).mockResolvedValue({
      composer_submit_mode: 'enter-sends',
    })
    vi.mocked(updateAgentSettings).mockResolvedValue({
      composer_submit_mode: 'mod-enter-sends',
    })

    const { result } = renderHook(() => useAiComposerPreferences())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.updateSubmitMode('mod-enter-sends')
    })

    await waitFor(() => {
      expect(result.current.submitMode).toBe('mod-enter-sends')
      expect(updateAgentSettings).toHaveBeenCalledWith({
        composer_submit_mode: 'mod-enter-sends',
      })
    })
  })
})
