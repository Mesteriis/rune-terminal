import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWindowTitleSettings } from '@/features/runtime/model/use-window-title-settings'
import { requestWindowTitleSettings, updateWindowTitleSettings } from '@/shared/api/runtime'

vi.mock('@/shared/api/runtime', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/runtime')>('@/shared/api/runtime')

  return {
    ...actual,
    requestWindowTitleSettings: vi.fn(),
    updateWindowTitleSettings: vi.fn(),
  }
})

describe('useWindowTitleSettings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads runtime-backed window title settings', async () => {
    vi.mocked(requestWindowTitleSettings).mockResolvedValue({
      auto_title: 'Workspace-2',
      settings: {
        custom_title: '',
        mode: 'auto',
      },
    })

    const { result } = renderHook(() => useWindowTitleSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.autoTitle).toBe('Workspace-2')
    expect(result.current.mode).toBe('auto')
    expect(result.current.customTitle).toBe('')
  })

  it('updates custom title settings through the HTTP contract', async () => {
    vi.mocked(requestWindowTitleSettings).mockResolvedValue({
      auto_title: 'Workspace-2',
      settings: {
        custom_title: '',
        mode: 'auto',
      },
    })
    vi.mocked(updateWindowTitleSettings).mockResolvedValue({
      auto_title: 'Workspace-2',
      settings: {
        custom_title: 'Ops Shell',
        mode: 'custom',
      },
    })

    const { result } = renderHook(() => useWindowTitleSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateSettings({
        customTitle: 'Ops Shell',
        mode: 'custom',
      })
    })

    expect(updateWindowTitleSettings).toHaveBeenCalledWith({
      custom_title: 'Ops Shell',
      mode: 'custom',
    })
    expect(result.current.mode).toBe('custom')
    expect(result.current.customTitle).toBe('Ops Shell')
  })
})
