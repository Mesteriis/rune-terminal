import { describe, expect, it, vi } from 'vitest'

import {
  ensureCurrentConversationSnapshotLoadedForPanel,
  loadContextWidgetsForPanel,
  persistCleanedContextWidgetSelectionForPanel,
  persistConversationContextPreferencesForPanel,
} from '@/features/agent/model/agent-panel-context-runtime'

describe('agent panel context runtime helpers', () => {
  it('loads the conversation snapshot only when panel messages are missing', async () => {
    const applyConversationSnapshot = vi.fn()
    const refreshConversationList = vi.fn().mockResolvedValue(null)
    const fetchAgentConversation = vi.fn().mockResolvedValue({
      id: 'conv-1',
      messages: [],
      provider: { kind: 'codex', base_url: 'codex', streaming: true },
      context_preferences: { widget_context_enabled: true, widget_ids: [] },
      title: 'Conversation',
      created_at: '2026-04-27T12:00:00Z',
      updated_at: '2026-04-27T12:00:00Z',
    })

    await ensureCurrentConversationSnapshotLoadedForPanel(
      {
        activeConversationID: '',
        applyConversationSnapshot,
        hasMessagesLoaded: false,
        refreshConversationList,
      },
      {
        deduplicateWidgetIDs: vi.fn(),
        fetchAgentConversation,
        fetchWorkspaceSnapshot: vi.fn(),
        filterContextWidgetSelection: vi.fn(),
        mapContextWidgetOptions: vi.fn(),
        updateAgentConversationContext: vi.fn(),
      },
    )

    expect(fetchAgentConversation).toHaveBeenCalledOnce()
    expect(applyConversationSnapshot).toHaveBeenCalledOnce()
    expect(refreshConversationList).toHaveBeenCalledOnce()
  })

  it('persists cleaned widget selections when missing widgets were removed', async () => {
    const persistConversationContextPreferences = vi.fn().mockResolvedValue(undefined)
    const setStoredContextWidgetIDs = vi.fn()
    const setMissingContextWidgetCount = vi.fn()

    await expect(
      persistCleanedContextWidgetSelectionForPanel(
        {
          hasCustomizedContextWidgetSelection: true,
          isWidgetContextEnabled: true,
          options: [{ value: 'term-main', label: 'Main Shell' }],
          persistConversationContextPreferences,
          setMissingContextWidgetCount,
          setStoredContextWidgetIDs,
          storedContextWidgetIDs: ['missing', 'term-main'],
        },
        {
          deduplicateWidgetIDs: vi.fn((ids: string[]) => [
            ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
          ]),
          fetchAgentConversation: vi.fn(),
          fetchWorkspaceSnapshot: vi.fn(),
          filterContextWidgetSelection: vi.fn((ids: string[]) => ids.filter((id) => id === 'term-main')),
          mapContextWidgetOptions: vi.fn(),
          updateAgentConversationContext: vi.fn(),
        },
      ),
    ).resolves.toBe(true)

    expect(setStoredContextWidgetIDs).toHaveBeenCalledWith(['term-main'])
    expect(setMissingContextWidgetCount).toHaveBeenCalledWith(0)
    expect(persistConversationContextPreferences).toHaveBeenCalledWith({
      widget_context_enabled: true,
      widget_ids: ['term-main'],
    })
  })

  it('loads workspace widgets and computes missing selection count', async () => {
    const setWorkspaceActiveWidgetID = vi.fn()
    const setContextWidgetOptions = vi.fn()
    const setContextWidgetLoadError = vi.fn()
    const setMissingContextWidgetCount = vi.fn((updater: (current: number) => number) => updater(0))

    await expect(
      loadContextWidgetsForPanel(
        {
          contextWidgetOptions: [],
          enabled: true,
          hasCustomizedContextWidgetSelection: true,
          hasLoadedContextWidgets: false,
          setContextWidgetLoadError,
          setContextWidgetOptions,
          setMissingContextWidgetCount,
          setWorkspaceActiveWidgetID,
          storedContextWidgetIDs: ['term-main', 'missing'],
          workspaceActiveWidgetID: '',
          workspaceWidgets: [],
        },
        {
          deduplicateWidgetIDs: vi.fn((ids: string[]) => [...new Set(ids)]),
          fetchAgentConversation: vi.fn(),
          fetchWorkspaceSnapshot: vi.fn().mockResolvedValue({
            active_widget_id: 'term-main',
            widgets: [{ id: 'term-main', kind: 'terminal', title: 'Main Shell' }],
          }),
          filterContextWidgetSelection: vi.fn((ids: string[]) => ids.filter((id) => id === 'term-main')),
          mapContextWidgetOptions: vi.fn().mockReturnValue([{ value: 'term-main', label: 'Main Shell' }]),
          updateAgentConversationContext: vi.fn(),
        },
      ),
    ).resolves.toMatchObject({
      activeWidgetID: 'term-main',
      options: [{ value: 'term-main', label: 'Main Shell' }],
    })

    expect(setWorkspaceActiveWidgetID).toHaveBeenCalledWith('term-main')
    expect(setContextWidgetOptions).toHaveBeenCalledWith([{ value: 'term-main', label: 'Main Shell' }])
    expect(setContextWidgetLoadError).toHaveBeenCalledWith(null)
  })

  it('persists context preferences against the active conversation', async () => {
    const applyConversationSnapshot = vi.fn()
    const refreshConversationList = vi.fn().mockResolvedValue(null)
    const updateAgentConversationContext = vi.fn().mockResolvedValue({
      id: 'conv-1',
      messages: [],
      provider: { kind: 'codex', base_url: 'codex', streaming: true },
      context_preferences: { widget_context_enabled: true, widget_ids: ['term-main'] },
      title: 'Conversation',
      created_at: '2026-04-27T12:00:00Z',
      updated_at: '2026-04-27T12:00:00Z',
    })

    await persistConversationContextPreferencesForPanel(
      {
        activeConversationID: 'conv-1',
        applyConversationSnapshot,
        preferences: { widget_context_enabled: true, widget_ids: ['term-main'] },
        refreshConversationList,
      },
      {
        deduplicateWidgetIDs: vi.fn(),
        fetchAgentConversation: vi.fn(),
        fetchWorkspaceSnapshot: vi.fn(),
        filterContextWidgetSelection: vi.fn(),
        mapContextWidgetOptions: vi.fn(),
        updateAgentConversationContext,
      },
    )

    expect(updateAgentConversationContext).toHaveBeenCalledWith('conv-1', {
      widget_context_enabled: true,
      widget_ids: ['term-main'],
    })
    expect(applyConversationSnapshot).toHaveBeenCalledOnce()
    expect(refreshConversationList).toHaveBeenCalledOnce()
  })
})
