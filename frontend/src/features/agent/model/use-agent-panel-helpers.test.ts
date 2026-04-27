import { describe, expect, it } from 'vitest'

import {
  deduplicateWidgetIDs,
  filterContextWidgetSelection,
  formatContextWidgetGroup,
  formatContextWidgetLabel,
  mapContextWidgetOptions,
  resolveContextTerminalWidget,
  sortConversationSummaries,
  upsertConversationSummary,
} from '@/features/agent/model/agent-panel-context'
import {
  directProviderChatModels,
  directProviderDefaultModel,
  providerOptionLabel,
  providerOptionsFromCatalog,
  providerViewToConversationProvider,
  selectPreferredChatModel,
} from '@/features/agent/model/agent-panel-provider'
import {
  sortMessagesBySortKey,
  updateInteractionMessage,
  upsertInteractionMessage,
} from '@/features/agent/model/chat-message-utils'

describe('useAgentPanel helpers', () => {
  it('maps provider catalog helpers consistently', () => {
    const provider = {
      id: 'codex',
      kind: 'codex',
      enabled: true,
      display_name: '',
      codex: {
        chat_models: ['gpt-5', 'gpt-5-mini'],
        command: 'codex',
        model: 'gpt-5',
      },
    }

    expect(directProviderChatModels(provider as never)).toEqual(['gpt-5', 'gpt-5-mini'])
    expect(directProviderDefaultModel(provider as never)).toBe('gpt-5')
    expect(providerOptionLabel(provider as never)).toBe('Codex CLI')
    expect(
      providerOptionsFromCatalog({
        active_provider_id: 'codex',
        providers: [provider as never, { ...provider, id: 'disabled', enabled: false } as never],
      }),
    ).toEqual([{ value: 'codex', label: 'Codex CLI' }])
    expect(
      providerViewToConversationProvider(provider as never, {
        kind: 'codex',
        base_url: '',
        model: 'fallback',
        streaming: false,
      }),
    ).toEqual({
      kind: 'codex',
      base_url: 'codex',
      model: 'gpt-5',
      streaming: false,
    })
    expect(selectPreferredChatModel('missing', 'gpt-5-mini', ['gpt-5-mini', 'gpt-5'])).toBe('gpt-5-mini')
  })

  it('maps and filters context widget options', () => {
    const widgets = [
      {
        id: 'term-main',
        kind: 'terminal',
        title: 'Main Shell',
        connection_id: 'local',
        path: '/repo',
      },
      {
        id: 'files-repo',
        kind: 'files',
        title: 'Repo Files',
        path: '/repo',
      },
    ]

    expect(deduplicateWidgetIDs(['term-main', ' term-main ', '', 'files-repo'])).toEqual([
      'term-main',
      'files-repo',
    ])
    expect(formatContextWidgetGroup('terminal')).toBe('Terminal widgets')
    expect(formatContextWidgetLabel(widgets[0] as never)).toContain('Main Shell')
    const options = mapContextWidgetOptions(widgets as never)
    expect(filterContextWidgetSelection(['missing', 'term-main', 'term-main'], options)).toEqual([
      'term-main',
    ])
    expect(resolveContextTerminalWidget(widgets as never, ['files-repo', 'term-main'])?.id).toBe('term-main')
  })

  it('sorts conversation summaries and chat messages deterministically', () => {
    const conversations = sortConversationSummaries([
      {
        id: 'older',
        title: 'Older',
        created_at: '2026-04-20T09:00:00Z',
        updated_at: '2026-04-20T10:00:00Z',
        archived_at: '',
        message_count: 1,
      },
      {
        id: 'newer',
        title: 'Newer',
        created_at: '2026-04-21T09:00:00Z',
        updated_at: '2026-04-21T10:00:00Z',
        archived_at: '',
        message_count: 1,
      },
    ] as never)

    expect(conversations[0]?.id).toBe('newer')
    expect(
      upsertConversationSummary(
        conversations as never,
        {
          id: 'archived',
          title: 'Archived',
          created_at: '2026-04-22T09:00:00Z',
          updated_at: '2026-04-22T10:00:00Z',
          archived_at: '2026-04-23T10:00:00Z',
          message_count: 1,
        } as never,
      ).at(-1)?.id,
    ).toBe('archived')

    const sortedMessages = sortMessagesBySortKey([
      { id: 'b', sortKey: 2 },
      { id: 'a', sortKey: 1 },
    ] as never)
    expect(sortedMessages.map((message) => message.id)).toEqual(['a', 'b'])

    const upsertedMessages = upsertInteractionMessage(
      sortedMessages as never,
      {
        id: 'c',
        sortKey: 3,
      } as never,
    )
    expect(upsertedMessages.map((message) => message.id)).toEqual(['a', 'b', 'c'])

    const updatedMessages = updateInteractionMessage(upsertedMessages as never, 'b', (message) => ({
      ...message,
      status: 'updated',
    }))
    expect(updatedMessages.find((message) => message.id === 'b')).toMatchObject({ status: 'updated' })
  })
})
