import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AiChatMessageWidget } from '@/widgets/ai/ai-chat-message-widget'

describe('AiChatMessageWidget', () => {
  it('renders a plan message with steps and tools', () => {
    render(
      <AiChatMessageWidget
        message={{
          id: 'plan-1',
          type: 'plan',
          planId: 'plan-1',
          steps: ['Read config', 'Call API', 'Save result'],
          tools: [
            { name: 'read_file', description: 'Inspect the existing configuration file.' },
            { name: 'http_request' },
          ],
        }}
        mode="chat"
      />,
    )

    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('1. Read config')).toBeInTheDocument()
    expect(screen.getByText('2. Call API')).toBeInTheDocument()
    expect(screen.getByText('3. Save result')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('- read_file')).toBeInTheDocument()
    expect(screen.getByText('Inspect the existing configuration file.')).toBeInTheDocument()
    expect(screen.getByText('- http_request')).toBeInTheDocument()
  })
})
