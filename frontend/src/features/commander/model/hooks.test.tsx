import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { listCommanderDirectory } from '@/features/commander/api/client'
import { useCommanderWidget } from '@/features/commander/model/hooks'
import { resetRuntimeContextCacheForTests, resolveRuntimeContext } from '@/shared/api/runtime'

vi.mock('@/features/commander/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/features/commander/api/client')>(
    '@/features/commander/api/client',
  )

  return {
    ...actual,
    listCommanderDirectory: vi.fn(),
  }
})

vi.mock('@/shared/api/runtime', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/runtime')>('@/shared/api/runtime')

  return {
    ...actual,
    resolveRuntimeContext: vi.fn(),
  }
})

describe('useCommanderWidget', () => {
  afterEach(() => {
    localStorage.clear()
    resetRuntimeContextCacheForTests()
    vi.clearAllMocks()
  })

  it('routes quick-filter confirmation through backend list query reloads', async () => {
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      authToken: 'runtime-token',
      baseUrl: 'http://127.0.0.1:8090',
      homeDir: '/Users/avm',
      repoRoot: '/Users/avm/projects/runa-terminal',
    })
    vi.mocked(listCommanderDirectory).mockImplementation(async (path, options) => {
      const query = options?.query?.trim()
      const entries =
        query === '*.md'
          ? [
              {
                id: `${path}::beta.md`,
                name: 'beta.md',
                ext: 'md',
                kind: 'file',
                sizeLabel: '1 KB',
                sizeBytes: 1024,
                modified: '2026-04-25 10:00',
                hidden: false,
              },
            ]
          : [
              {
                id: `${path}::alpha.ts`,
                name: 'alpha.ts',
                ext: 'ts',
                kind: 'file',
                sizeLabel: '1 KB',
                sizeBytes: 1024,
                modified: '2026-04-25 10:00',
                hidden: false,
              },
              {
                id: `${path}::beta.md`,
                name: 'beta.md',
                ext: 'md',
                kind: 'file',
                sizeLabel: '1 KB',
                sizeBytes: 1024,
                modified: '2026-04-25 10:00',
                hidden: false,
              },
            ]

      return {
        entries,
        path,
      }
    })

    const widgetId = `commander-filter-${Math.random().toString(36).slice(2)}`
    const { result } = renderHook(() => useCommanderWidget(widgetId))

    await waitFor(() => {
      expect(result.current.state.leftPane.isLoading).toBe(false)
      expect(result.current.state.rightPane.isLoading).toBe(false)
    })

    act(() => {
      result.current.commanderActions.filterActivePane()
    })

    await waitFor(() => {
      expect(result.current.state.pendingOperation?.kind).toBe('filter')
    })

    act(() => {
      result.current.commanderActions.setPendingOperationInput('*.md')
    })

    await waitFor(() => {
      expect(result.current.state.pendingOperation).toMatchObject({
        kind: 'filter',
        inputValue: '*.md',
        matchCount: 1,
      })
    })

    act(() => {
      result.current.commanderActions.confirmPendingOperation()
    })

    await waitFor(() => {
      expect(result.current.state.pendingOperation).toBeNull()
      expect(listCommanderDirectory).toHaveBeenCalledTimes(3)
    })

    expect(listCommanderDirectory).toHaveBeenNthCalledWith(3, '/Users/avm/projects/runa-terminal', {
      query: '*.md',
    })
  })
})
