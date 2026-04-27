import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAgentPanelContextSelection } from '@/features/agent/model/use-agent-panel-context-selection'

describe('useAgentPanelContextSelection', () => {
  it('derives fallback and active context widget ids from terminal bindings', () => {
    const persistConversationContextPreferences = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useAgentPanelContextSelection({
        activeWidgetHostId: 'ai-main',
        contextWidgetOptions: [{ value: 'term-main', label: 'Main Shell' }],
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        isWidgetContextEnabled: true,
        missingContextWidgetCount: 0,
        persistConversationContextPreferences,
        setHasCustomizedContextWidgetSelection: vi.fn(),
        setIsWidgetContextEnabled: vi.fn(),
        setMissingContextWidgetCount: vi.fn(),
        setStoredContextWidgetIDs: vi.fn(),
        setSubmitError: vi.fn(),
        storedContextWidgetIDs: [],
        terminalPanelBindings: {
          'ai-main': {
            runtimeWidgetId: 'term-main',
            preset: 'main',
          },
        } as never,
        workspaceActiveWidgetID: '',
      }),
    )

    expect(result.current.deriveFallbackContextWidgetIDs()).toEqual(['term-main'])
    expect(result.current.effectiveContextWidgetIDs).toEqual(['term-main'])
    expect(result.current.activeContextWidgetID).toBe('term-main')
    expect(result.current.activeContextWidgetOption).toMatchObject({ value: 'term-main' })
  })

  it('updates selected widget ids and persists the new context selection', async () => {
    const persistConversationContextPreferences = vi.fn().mockResolvedValue(undefined)
    const setHasCustomizedContextWidgetSelection = vi.fn()
    const setStoredContextWidgetIDs = vi.fn()
    const setIsWidgetContextEnabled = vi.fn()
    const setMissingContextWidgetCount = vi.fn()

    const { result } = renderHook(() =>
      useAgentPanelContextSelection({
        activeWidgetHostId: 'ai-main',
        contextWidgetOptions: [{ value: 'term-main', label: 'Main Shell' }],
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        isWidgetContextEnabled: true,
        missingContextWidgetCount: 0,
        persistConversationContextPreferences,
        setHasCustomizedContextWidgetSelection,
        setIsWidgetContextEnabled,
        setMissingContextWidgetCount,
        setStoredContextWidgetIDs,
        setSubmitError: vi.fn(),
        storedContextWidgetIDs: [],
        terminalPanelBindings: {} as never,
        workspaceActiveWidgetID: '',
      }),
    )

    act(() => {
      result.current.updateSelectedContextWidgetIDs([' term-main ', 'term-main'])
    })

    await Promise.resolve()

    expect(setHasCustomizedContextWidgetSelection).toHaveBeenCalledWith(true)
    expect(setStoredContextWidgetIDs).toHaveBeenCalledWith(['term-main'])
    expect(setIsWidgetContextEnabled).toHaveBeenCalledWith(true)
    expect(setMissingContextWidgetCount).toHaveBeenCalledWith(0)
    expect(persistConversationContextPreferences).toHaveBeenCalledWith({
      widget_context_enabled: true,
      widget_ids: ['term-main'],
    })
  })

  it('creates conversation and tool execution contexts from the effective widget selection', () => {
    const { result } = renderHook(() =>
      useAgentPanelContextSelection({
        activeWidgetHostId: 'ai-main',
        contextWidgetOptions: [{ value: 'term-main', label: 'Main Shell' }],
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        isWidgetContextEnabled: true,
        missingContextWidgetCount: 0,
        persistConversationContextPreferences: vi.fn().mockResolvedValue(undefined),
        setHasCustomizedContextWidgetSelection: vi.fn(),
        setIsWidgetContextEnabled: vi.fn(),
        setMissingContextWidgetCount: vi.fn(),
        setStoredContextWidgetIDs: vi.fn(),
        setSubmitError: vi.fn(),
        storedContextWidgetIDs: ['term-main'],
        terminalPanelBindings: {} as never,
        workspaceActiveWidgetID: '',
      }),
    )

    expect(
      result.current.createConversationContext({
        actionSource: 'frontend.ai.sidebar',
        includeActiveWidgetInSelection: true,
        repoRoot: '/repo',
      }),
    ).toEqual({
      action_source: 'frontend.ai.sidebar',
      active_widget_id: 'term-main',
      repo_root: '/repo',
      widget_context_enabled: true,
      widget_ids: ['term-main'],
    })

    expect(
      result.current.createToolExecutionContext({
        actionSource: 'frontend.ai.sidebar',
        repoRoot: '/repo',
      }),
    ).toEqual({
      action_source: 'frontend.ai.sidebar',
      active_widget_id: 'term-main',
      repo_root: '/repo',
      target_connection_id: undefined,
      target_session: undefined,
    })
  })
})
