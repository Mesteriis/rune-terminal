import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { AiPanelWidget } from '@/widgets/ai/ai-panel-widget'
import { aiPanelWidgetMockState } from '@/widgets/ai/ai-panel-widget.mock'

vi.mock('@tsparticles/react', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-particles" />,
  initParticlesEngine: vi.fn(async (loader: (engine: unknown) => Promise<void>) => {
    await loader({})
  }),
}))

vi.mock('tsparticles', () => ({
  loadFull: vi.fn(async () => {}),
}))

function createDeferredStreamResponse() {
  const encoder = new TextEncoder()
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null

  return {
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller
      },
    }),
    close() {
      controllerRef?.close()
    },
    push(chunk: string) {
      controllerRef?.enqueue(encoder.encode(chunk))
    },
  }
}

describe('AiPanelWidget backend conversation path', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders backend conversation content on the main path', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            messages: [
              {
                id: 'msg_1',
                role: 'user',
                content: 'Inspect the backend contract',
                status: 'complete',
                created_at: '2026-04-21T10:00:00Z',
              },
              {
                id: 'msg_2',
                role: 'assistant',
                content: 'The backend contract is ready.',
                status: 'complete',
                provider: 'stub',
                model: 'stub-model',
                created_at: '2026-04-21T10:00:05Z',
              },
            ],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            updated_at: '2026-04-21T10:00:05Z',
          },
        }),
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Inspect the backend contract')).toBeInTheDocument()
    })

    expect(screen.getByText('Inspect the backend contract')).toBeInTheDocument()
    expect(screen.getByText('The backend contract is ready.')).toBeInTheDocument()
    expect(screen.getByText('stub-model · complete')).toBeInTheDocument()
    expect(screen.queryByText('User 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Assistant 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()
    expect(screen.queryByText('Summary')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }))

    expect(screen.getByText('Prompt')).toBeInTheDocument()
    expect(screen.getByText('Reasoning')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(
      screen.getByText('Assistant · complete · stub · stub-model · 2026-04-21 10:00'),
    ).toBeInTheDocument()

    const [userRow] = Array.from(document.querySelectorAll('[data-runa-chat-role="user"]'))
    const [assistantRow] = Array.from(document.querySelectorAll('[data-runa-chat-role="assistant"]'))

    expect((userRow as HTMLDivElement | undefined)?.style.justifyContent).toBe('flex-end')
    expect((assistantRow as HTMLDivElement | undefined)?.style.justifyContent).toBe('flex-start')
  })

  it('streams visible assistant output through the backend conversation stream route', async () => {
    const streamResponse = createDeferredStreamResponse()
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            updated_at: '2026-04-21T10:00:00Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: streamResponse.body,
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Text Area'), {
      target: { value: 'Send this to the backend' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    await waitFor(() => {
      expect(fetchMock.mock.calls[2]?.[0]).toBe(
        'http://127.0.0.1:8090/api/v1/agent/conversation/messages/stream',
      )
    })
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      prompt: 'Send this to the backend',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_context_enabled: true,
      },
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Widget ai-shell-panel is busy')).toBeInTheDocument()
    })

    await act(async () => {
      streamResponse.push(
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.push(
        'event: text-delta\ndata: {"type":"text-delta","message_id":"msg_2","delta":"Backend "}\n\n',
      )
    })

    await waitFor(() => {
      expect(screen.getByText((value) => value.includes('Backend'))).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()

    await act(async () => {
      streamResponse.push(
        'event: text-delta\ndata: {"type":"text-delta","message_id":"msg_2","delta":"message received."}\n\n',
      )
      streamResponse.push(
        'event: message-complete\ndata: {"type":"message-complete","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"Backend message received.","status":"complete","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.close()
    })

    await waitFor(() => {
      expect(screen.getByText('Backend message received.')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByLabelText('Widget ai-shell-panel is busy')).not.toBeInTheDocument()
    })
  })

  it('clears busy state and keeps partial assistant output coherent on backend error events', async () => {
    const streamResponse = createDeferredStreamResponse()
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          home_dir: '/Users/avm',
          repo_root: '/Users/avm/projects/runa-terminal',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            messages: [],
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: true,
            },
            updated_at: '2026-04-21T10:00:00Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: streamResponse.body,
      })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Text Area'), {
      target: { value: 'Trigger backend error' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    await waitFor(() => {
      expect(screen.getByLabelText('Widget ai-shell-panel is busy')).toBeInTheDocument()
    })

    await act(async () => {
      streamResponse.push(
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.push(
        'event: text-delta\ndata: {"type":"text-delta","message_id":"msg_2","delta":"Partial reply"}\n\n',
      )
      streamResponse.push(
        'event: error\ndata: {"type":"error","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"Partial reply","status":"error","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"},"error":"provider unavailable"}\n\n',
      )
      streamResponse.close()
    })

    await waitFor(() => {
      expect(screen.getByText('Partial reply')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByLabelText('Widget ai-shell-panel is busy')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Send prompt')).toBeEnabled()
    })
  })

  it('updates detail visibility immediately when the chat mode changes', () => {
    const { rerender } = render(
      <AiPanelWidget hostId="ai-shell-panel" mode="chat" state={aiPanelWidgetMockState} />,
    )

    expect(screen.queryByText('Prompt')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Show details' })).toHaveLength(2)

    rerender(<AiPanelWidget hostId="ai-shell-panel" mode="dev" state={aiPanelWidgetMockState} />)

    expect(screen.getAllByText('Prompt')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Hide details' })).toHaveLength(2)

    rerender(<AiPanelWidget hostId="ai-shell-panel" mode="debug" state={aiPanelWidgetMockState} />)

    expect(screen.getAllByText('Prompt')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Show details' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hide details' })).not.toBeInTheDocument()
  })
})
