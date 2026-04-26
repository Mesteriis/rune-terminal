import { useState } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AiChatMessageWidget } from '@/widgets/ai/ai-chat-message-widget'
import type { ApprovalMessage, QuestionnaireMessage } from '@/features/agent/model/types'

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

  it('updates approval state when approve or cancel is clicked', () => {
    function ApprovalHarness() {
      const [message, setMessage] = useState<ApprovalMessage>({
        id: 'approval-1',
        type: 'approval',
        planId: 'plan-1',
        status: 'pending',
      })

      return (
        <AiChatMessageWidget
          message={message}
          mode="chat"
          onApprovalApprove={(nextMessage) => {
            setMessage({ ...nextMessage, status: 'approved' })
          }}
          onApprovalCancel={(nextMessage) => {
            setMessage({ ...nextMessage, status: 'cancelled' })
          }}
        />
      )
    }

    const { rerender } = render(<ApprovalHarness />)

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(screen.getByText('Execution approved.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    function CancelHarness() {
      const [message, setMessage] = useState<ApprovalMessage>({
        id: 'approval-2',
        type: 'approval',
        planId: 'plan-2',
        status: 'pending',
      })

      return (
        <AiChatMessageWidget
          message={message}
          mode="chat"
          onApprovalApprove={(nextMessage) => {
            setMessage({ ...nextMessage, status: 'approved' })
          }}
          onApprovalCancel={(nextMessage) => {
            setMessage({ ...nextMessage, status: 'cancelled' })
          }}
        />
      )
    }

    rerender(<CancelHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Execution cancelled.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('renders audit entries with visible statuses', () => {
    render(
      <AiChatMessageWidget
        message={{
          id: 'audit-1',
          type: 'audit',
          entries: [
            { tool: 'read_file', status: 'done', timestamp: Date.parse('2026-04-21T10:00:00Z') },
            { tool: 'http_request', status: 'running', timestamp: Date.parse('2026-04-21T10:00:01Z') },
            { tool: 'save_result', status: 'pending' },
          ],
        }}
        mode="chat"
      />,
    )

    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('read_file')).toBeInTheDocument()
    expect(screen.getByText('done')).toBeInTheDocument()
    expect(screen.getByText('http_request')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByText('save_result')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('renders assistant chat messages with compact meta chrome and grouped details', () => {
    render(
      <AiChatMessageWidget
        message={{
          id: 'chat-1',
          type: 'chat',
          role: 'assistant',
          content: 'The backend contract is ready.',
          meta: {
            provider: 'codex',
            model: 'gpt-5.4',
            status: 'complete',
            prompt: 'Inspect the backend contract',
            reasoning: 'Compared the transport adapter against the service layer.',
            summary: 'No contract drift found.',
          },
        }}
        mode="chat"
      />,
    )

    expect(screen.getByText('gpt-5.4 · complete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()
    expect(screen.queryByText('Request details')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }))

    expect(screen.getByText('Request details')).toBeInTheDocument()
    expect(screen.getByText('4 fields')).toBeInTheDocument()
    expect(screen.getByText('Prompt')).toBeInTheDocument()
    expect(screen.getByText('Reasoning')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide details' })).toBeInTheDocument()
  })

  it('renders attachment chips for chat messages', () => {
    render(
      <AiChatMessageWidget
        message={{
          id: 'chat-with-attachment',
          type: 'chat',
          role: 'user',
          content: 'Summarize this file.',
          attachments: [
            {
              id: 'att-readme',
              name: 'README.md',
              path: '/repo/README.md',
              mime_type: 'text/markdown',
              size: 2048,
              modified_time: 1_776_800_060,
            },
          ],
        }}
        mode="chat"
      />,
    )

    expect(screen.getByText('Summarize this file.')).toBeInTheDocument()
    expect(screen.getByLabelText('Attachments for user message')).toHaveTextContent('README.md')
  })

  it('submits questionnaire option and custom input answers', () => {
    function QuestionnaireHarness() {
      const [message, setMessage] = useState<QuestionnaireMessage>({
        id: 'question-1',
        type: 'questionnaire',
        question: 'Choose environment:',
        options: [
          { label: 'Production', value: 'production' },
          { label: 'Staging', value: 'staging' },
        ],
        allowCustom: true,
        status: 'pending',
      })

      return (
        <AiChatMessageWidget
          message={message}
          mode="chat"
          onQuestionnaireAnswer={(nextMessage, answer) => {
            setMessage({ ...nextMessage, answer, status: 'answered' })
          }}
        />
      )
    }

    const { rerender } = render(<QuestionnaireHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Staging' }))

    expect(screen.getByText('Answer: staging')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Production' })).not.toBeInTheDocument()

    function CustomHarness() {
      const [message, setMessage] = useState<QuestionnaireMessage>({
        id: 'question-2',
        type: 'questionnaire',
        question: 'Choose environment:',
        options: [
          { label: 'Production', value: 'production' },
          { label: 'Staging', value: 'staging' },
        ],
        allowCustom: true,
        status: 'pending',
      })

      return (
        <AiChatMessageWidget
          message={message}
          mode="chat"
          onQuestionnaireAnswer={(nextMessage, answer) => {
            setMessage({ ...nextMessage, answer, status: 'answered' })
          }}
        />
      )
    }

    rerender(<CustomHarness />)

    fireEvent.change(screen.getByPlaceholderText('Custom input'), {
      target: { value: 'development' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(screen.getByText('Answer: development')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
  })
})
