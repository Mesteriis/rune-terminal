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

    expect(screen.getByRole('combobox', { name: 'Conversation' })).toHaveValue('conv_2')

    fireEvent.change(screen.getByRole('combobox', { name: 'Conversation' }), {
      target: { value: 'conv_1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create conversation' }))

    expect(onConversationSelect).toHaveBeenCalledWith('conv_1')
    expect(onCreateConversation).toHaveBeenCalledTimes(1)
  })
})
