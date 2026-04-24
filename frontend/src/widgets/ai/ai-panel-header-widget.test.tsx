import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AiPanelHeaderWidget } from '@/widgets/ai/ai-panel-header-widget'

describe('AiPanelHeaderWidget', () => {
  it('renders conversations and routes select/create actions through the header controls', () => {
    const onConversationSelect = vi.fn()
    const onCreateConversation = vi.fn()

    render(
      <AiPanelHeaderWidget
        activeConversationID="conv_2"
        conversations={[
          {
            id: 'conv_1',
            title: 'Earlier thread',
            created_at: '2026-04-24T09:00:00Z',
            updated_at: '2026-04-24T09:05:00Z',
            message_count: 2,
          },
          {
            id: 'conv_2',
            title: 'Current thread',
            created_at: '2026-04-24T10:00:00Z',
            updated_at: '2026-04-24T10:01:00Z',
            message_count: 1,
          },
        ]}
        mode="chat"
        onConversationSelect={onConversationSelect}
        onCreateConversation={onCreateConversation}
        onModeChange={() => {}}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    expect(screen.getByRole('dialog', { name: 'Conversation navigator' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('option', { name: 'Open conversation Earlier thread' }))
    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create conversation' }))

    expect(onConversationSelect).toHaveBeenCalledWith('conv_1')
    expect(onCreateConversation).toHaveBeenCalledTimes(1)
  })

  it('routes active conversation rename through the header controls', () => {
    const onRenameConversation = vi.fn()

    render(
      <AiPanelHeaderWidget
        activeConversationID="conv_2"
        conversations={[
          {
            id: 'conv_1',
            title: 'Earlier thread',
            created_at: '2026-04-24T09:00:00Z',
            updated_at: '2026-04-24T09:05:00Z',
            message_count: 2,
          },
          {
            id: 'conv_2',
            title: 'Current thread',
            created_at: '2026-04-24T10:00:00Z',
            updated_at: '2026-04-24T10:01:00Z',
            message_count: 1,
          },
        ]}
        mode="chat"
        onRenameConversation={onRenameConversation}
        onModeChange={() => {}}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename conversation' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Conversation title' }), {
      target: { value: 'Renamed thread' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save conversation title' }))

    expect(onRenameConversation).toHaveBeenCalledWith('conv_2', 'Renamed thread')
  })

  it('shows the renamed title optimistically while the rename request is still pending', () => {
    let resolveRename: (() => void) | null = null
    const onRenameConversation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRename = resolve
        }),
    )

    render(
      <AiPanelHeaderWidget
        activeConversationID="conv_2"
        conversations={[
          {
            id: 'conv_2',
            title: 'Current thread',
            created_at: '2026-04-24T10:00:00Z',
            updated_at: '2026-04-24T10:01:00Z',
            message_count: 1,
          },
        ]}
        mode="chat"
        onRenameConversation={onRenameConversation}
        onModeChange={() => {}}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename conversation' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Conversation title' }), {
      target: { value: 'Renamed thread' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save conversation title' }))

    expect(screen.getByRole('button', { name: 'Conversation menu' })).toHaveTextContent('Renamed thread')

    resolveRename?.()
  })
})
