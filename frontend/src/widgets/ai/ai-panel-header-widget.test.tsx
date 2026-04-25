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

  it('routes active conversation delete through the header controls after confirmation', () => {
    const onDeleteConversation = vi.fn()

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
        onDeleteConversation={onDeleteConversation}
        onModeChange={() => {}}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete conversation' }))
    expect(screen.getByText('Delete active conversation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete conversation' }))

    expect(onDeleteConversation).toHaveBeenCalledWith('conv_2')
  })

  it('routes active conversation archive through the header controls and groups archived threads', () => {
    const onArchiveConversation = vi.fn()

    render(
      <AiPanelHeaderWidget
        activeConversationID="conv_2"
        conversations={[
          {
            id: 'conv_1',
            title: 'Archived thread',
            created_at: '2026-04-24T09:00:00Z',
            updated_at: '2026-04-24T09:05:00Z',
            archived_at: '2026-04-24T09:06:00Z',
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
        onArchiveConversation={onArchiveConversation}
        onModeChange={() => {}}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    expect(screen.getByText('Recent')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Archive conversation' }))

    expect(onArchiveConversation).toHaveBeenCalledWith('conv_2')
  })

  it('routes active archived conversation restore through the header controls', () => {
    const onRestoreConversation = vi.fn()

    render(
      <AiPanelHeaderWidget
        activeConversationID="conv_2"
        conversations={[
          {
            id: 'conv_2',
            title: 'Archived thread',
            created_at: '2026-04-24T10:00:00Z',
            updated_at: '2026-04-24T10:01:00Z',
            archived_at: '2026-04-24T10:10:00Z',
            message_count: 1,
          },
        ]}
        mode="chat"
        onModeChange={() => {}}
        onRestoreConversation={onRestoreConversation}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore conversation' }))

    expect(onRestoreConversation).toHaveBeenCalledWith('conv_2')
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

  it('filters the conversation list locally inside the navigator', () => {
    render(
      <AiPanelHeaderWidget
        activeConversationID="conv_2"
        conversations={[
          {
            id: 'conv_1',
            title: 'Backend audit thread',
            created_at: '2026-04-24T09:00:00Z',
            updated_at: '2026-04-24T09:05:00Z',
            message_count: 2,
          },
          {
            id: 'conv_2',
            title: 'Terminal restart notes',
            created_at: '2026-04-24T10:00:00Z',
            updated_at: '2026-04-24T10:01:00Z',
            message_count: 1,
          },
        ]}
        mode="chat"
        onModeChange={() => {}}
        title="AI Rune"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Conversation menu' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search conversations' }), {
      target: { value: 'terminal' },
    })

    expect(
      screen.getByRole('option', {
        name: 'Open conversation Terminal restart notes',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', {
        name: 'Open conversation Backend audit thread',
      }),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search conversations' }), {
      target: { value: 'missing' },
    })

    expect(screen.getByText('No conversations match this filter.')).toBeInTheDocument()
  })
})
