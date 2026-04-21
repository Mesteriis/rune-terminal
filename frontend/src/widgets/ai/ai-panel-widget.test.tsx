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

function mockScrollViewportMetrics(
  viewport: HTMLDivElement,
  input: {
    clientHeight?: number
    scrollHeight: number
    scrollTop: number
  },
) {
  let clientHeightValue = input.clientHeight ?? 320
  let scrollHeightValue = input.scrollHeight
  let scrollTopValue = input.scrollTop

  Object.defineProperty(viewport, 'clientHeight', {
    configurable: true,
    get: () => clientHeightValue,
  })
  Object.defineProperty(viewport, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeightValue,
  })
  Object.defineProperty(viewport, 'scrollTop', {
    configurable: true,
    get: () => scrollTopValue,
    set: (value: number) => {
      scrollTopValue = value
    },
  })

  return {
    getScrollTop: () => scrollTopValue,
    setClientHeight: (value: number) => {
      clientHeightValue = value
    },
    setScrollHeight: (value: number) => {
      scrollHeightValue = value
    },
    setScrollTop: (value: number) => {
      scrollTopValue = value
    },
  }
}

function createProviderCatalogFetchResponse(chatModels: string[] = ['stub-model']) {
  return {
    ok: true,
    json: async () => ({
      providers: [
        {
          id: 'provider-stub',
          kind: 'openai',
          display_name: 'Stub OpenAI',
          enabled: true,
          active: true,
          openai: {
            base_url: 'http://stub',
            model: 'stub-model',
            chat_models: chatModels,
            has_api_key: true,
          },
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:00:00Z',
        },
      ],
      active_provider_id: 'provider-stub',
      supported_kinds: ['ollama', 'codex', 'openai', 'proxy'],
    }),
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
      .mockResolvedValueOnce(createProviderCatalogFetchResponse())
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Inspect the backend contract')).toBeInTheDocument()
    })

    const userMessage = screen.getByText('Inspect the backend contract')
    const assistantMessage = screen.getByText('The backend contract is ready.')

    expect(userMessage).toBeInTheDocument()
    expect(assistantMessage).toBeInTheDocument()
    expect(screen.getByText('stub-model · complete')).toBeInTheDocument()
    expect(screen.queryByText('User 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Assistant 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()
    expect(screen.queryByText('Summary')).not.toBeInTheDocument()

    expect(
      userMessage.compareDocumentPosition(assistantMessage) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const [userRow] = Array.from(document.querySelectorAll('[data-runa-chat-role="user"]'))
    const [assistantRow] = Array.from(document.querySelectorAll('[data-runa-chat-role="assistant"]'))

    expect((userRow as HTMLDivElement | undefined)?.style.justifyContent).toBe('flex-end')
    expect((assistantRow as HTMLDivElement | undefined)?.style.justifyContent).toBe('flex-start')
    expect((assistantRow as HTMLDivElement | undefined)?.style.paddingBottom).toBe('var(--space-lg)')
    expect((userRow as HTMLDivElement | undefined)?.style.paddingBottom).toBe('var(--space-xs)')
  })

  it('streams pure chat prompts without plan or approval gates', async () => {
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
      .mockResolvedValueOnce(createProviderCatalogFetchResponse())
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
      target: { value: 'Привет' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    await waitFor(() => {
      expect(fetchMock.mock.calls[3]?.[0]).toBe(
        'http://127.0.0.1:8090/api/v1/agent/conversation/messages/stream',
      )
    })
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({
      prompt: 'Привет',
      model: 'stub-model',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_context_enabled: true,
      },
    })
    expect(screen.queryByText('Plan')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
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
      .mockResolvedValueOnce(createProviderCatalogFetchResponse())
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
      expect(screen.getByPlaceholderText('Text Area')).toBeEnabled()
    })
  })

  it('blocks execution until the user answers the questionnaire and approves the plan', async () => {
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
      .mockResolvedValueOnce(createProviderCatalogFetchResponse())
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
      target: { value: 'Deploy the current config' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Choose environment:')).toBeInTheDocument()
    expect(screen.queryByText('Plan')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Staging' }))

    expect(screen.getByText('Answer: staging')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls[3]?.[0]).toBe(
        'http://127.0.0.1:8090/api/v1/agent/conversation/messages/stream',
      )
    })

    await act(async () => {
      streamResponse.push(
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.push(
        'event: message-complete\ndata: {"type":"message-complete","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"Deployment queued.","status":"complete","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.close()
    })

    await waitFor(() => {
      expect(screen.getByText('Deployment queued.')).toBeInTheDocument()
    })
  })

  it('stops the flow when approval is cancelled', async () => {
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
      .mockResolvedValueOnce(createProviderCatalogFetchResponse())
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Text Area'), {
      target: { value: 'прочитай файл' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Execution cancelled.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
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

  it('preserves the reader position when a new message is appended below older content', () => {
    const { rerender } = render(<AiPanelWidget hostId="ai-shell-panel" state={aiPanelWidgetMockState} />)
    const viewport = document.querySelector('[data-runa-ai-message-viewport]') as HTMLDivElement | null

    expect(viewport).not.toBeNull()

    const metrics = mockScrollViewportMetrics(viewport!, {
      scrollHeight: 960,
      scrollTop: 180,
    })

    fireEvent.scroll(viewport!)
    metrics.setScrollHeight(1080)

    rerender(
      <AiPanelWidget
        hostId="ai-shell-panel"
        state={{
          ...aiPanelWidgetMockState,
          messages: [
            ...aiPanelWidgetMockState.messages,
            {
              id: 'message-5',
              type: 'chat',
              role: 'assistant',
              content: 'A new assistant message arrived.',
              meta: {
                model: 'mock-model',
                status: 'complete',
              },
            },
          ],
        }}
      />,
    )

    expect(metrics.getScrollTop()).toBe(180)
  })

  it('keeps the latest message pinned when the viewport is already near the bottom', () => {
    const { rerender } = render(<AiPanelWidget hostId="ai-shell-panel" state={aiPanelWidgetMockState} />)
    const viewport = document.querySelector('[data-runa-ai-message-viewport]') as HTMLDivElement | null

    expect(viewport).not.toBeNull()

    const metrics = mockScrollViewportMetrics(viewport!, {
      scrollHeight: 960,
      scrollTop: 628,
    })

    fireEvent.scroll(viewport!)
    metrics.setScrollHeight(1080)

    rerender(
      <AiPanelWidget
        hostId="ai-shell-panel"
        state={{
          ...aiPanelWidgetMockState,
          messages: [
            ...aiPanelWidgetMockState.messages,
            {
              id: 'message-5',
              type: 'chat',
              role: 'assistant',
              content: 'A new assistant message arrived.',
              meta: {
                model: 'mock-model',
                status: 'complete',
              },
            },
          ],
        }}
      />,
    )

    expect(metrics.getScrollTop()).toBe(760)
  })

  it('renders all supported AI message types through the shared transcript switch', () => {
    render(
      <AiPanelWidget
        hostId="ai-shell-panel"
        state={{
          ...aiPanelWidgetMockState,
          messages: [
            ...aiPanelWidgetMockState.messages,
            {
              id: 'plan-1',
              type: 'plan',
              planId: 'plan-1',
              steps: ['Read config', 'Call API'],
              tools: [{ name: 'read_file' }, { name: 'http_request' }],
            },
            {
              id: 'question-1',
              type: 'questionnaire',
              question: 'Choose environment:',
              options: [
                { label: 'Production', value: 'production' },
                { label: 'Staging', value: 'staging' },
              ],
              allowCustom: true,
              status: 'pending',
            },
            {
              id: 'approval-1',
              type: 'approval',
              planId: 'plan-1',
              status: 'pending',
            },
            {
              id: 'audit-1',
              type: 'audit',
              entries: [
                { tool: 'read_file', status: 'done' },
                { tool: 'http_request', status: 'running' },
              ],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Choose environment:')).toBeInTheDocument()
    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(
      screen.getByText('Review the current frontend slice and propose the narrowest safe refactor sequence.'),
    ).toBeInTheDocument()
  })
})
