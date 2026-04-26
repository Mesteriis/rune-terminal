import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  registerTerminalPanelBinding,
  resetTerminalPanelBindingsForTests,
} from '@/features/terminal/model/panel-registry'
import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { clearActiveWidgetHostId, setActiveWidgetHostId } from '@/shared/model/widget-focus'
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

function createProviderCatalogFetchResponse(
  chatModels: string[] = ['stub-model'],
  providers?: Array<Record<string, unknown>>,
  activeProviderId = 'provider-stub',
) {
  return {
    ok: true,
    json: async () => ({
      providers: providers ?? [
        {
          id: 'provider-stub',
          kind: 'codex',
          display_name: 'Stub Codex CLI',
          enabled: true,
          active: true,
          codex: {
            command: 'codex',
            model: 'stub-model',
            chat_models: chatModels,
            status_state: 'ready',
          },
          created_at: '2026-04-21T10:00:00Z',
          updated_at: '2026-04-21T10:00:00Z',
        },
      ],
      active_provider_id: activeProviderId,
      supported_kinds: ['codex', 'claude', 'openai-compatible'],
    }),
  }
}

function createConversationFetchResponse(
  overrides: Partial<Record<string, unknown>> = {},
  messages: Array<Record<string, unknown>> = [],
) {
  return {
    ok: true,
    json: async () => ({
      conversation: {
        id: 'conv_1',
        title: 'Backend conversation',
        messages,
        provider: {
          kind: 'stub',
          base_url: 'http://stub',
          model: 'stub-model',
          streaming: false,
        },
        created_at: '2026-04-21T09:59:00Z',
        updated_at: '2026-04-21T10:00:00Z',
        ...overrides,
      },
    }),
  }
}

function createConversationListFetchResponse(
  activeConversationID = 'conv_1',
  conversations = [
    {
      id: 'conv_1',
      title: 'Backend conversation',
      created_at: '2026-04-21T09:59:00Z',
      updated_at: '2026-04-21T10:00:00Z',
      message_count: 0,
    },
  ],
) {
  return {
    ok: true,
    json: async () => ({
      active_conversation_id: activeConversationID,
      conversations,
    }),
  }
}

describe('AiPanelWidget backend conversation path', () => {
  afterEach(() => {
    resetRuntimeContextCacheForTests()
    resetTerminalPanelBindingsForTests()
    clearActiveWidgetHostId()
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
    expect(screen.getAllByRole('button', { name: 'Show details' }).length).toBeGreaterThan(0)
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

  it('switches the active provider from the chat toolbar and updates the available models', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Provider switch test',
          provider: {
            kind: 'codex',
            base_url: 'codex',
            model: 'stub-model',
            streaming: false,
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse(
          ['stub-model'],
          [
            {
              id: 'provider-stub',
              kind: 'codex',
              display_name: 'Stub Codex CLI',
              enabled: true,
              active: true,
              codex: {
                command: 'codex',
                model: 'stub-model',
                chat_models: ['stub-model'],
                status_state: 'ready',
              },
              created_at: '2026-04-21T10:00:00Z',
              updated_at: '2026-04-21T10:00:00Z',
            },
            {
              id: 'provider-http',
              kind: 'openai-compatible',
              display_name: 'LAN Source',
              enabled: true,
              active: false,
              openai_compatible: {
                base_url: 'http://192.168.1.8:8317',
                model: 'gpt-5.4',
                chat_models: ['gpt-5.4', 'claude-sonnet-4-6'],
              },
              created_at: '2026-04-24T10:00:00Z',
              updated_at: '2026-04-24T10:00:00Z',
            },
          ],
        )
      }

      if (url.includes('/api/v1/agent/providers/active')) {
        return {
          ok: true,
          json: async () => ({
            providers: [
              {
                id: 'provider-stub',
                kind: 'codex',
                display_name: 'Stub Codex CLI',
                enabled: true,
                active: false,
                codex: {
                  command: 'codex',
                  model: 'stub-model',
                  chat_models: ['stub-model'],
                  status_state: 'ready',
                },
                created_at: '2026-04-21T10:00:00Z',
                updated_at: '2026-04-21T10:00:00Z',
              },
              {
                id: 'provider-http',
                kind: 'openai-compatible',
                display_name: 'LAN Source',
                enabled: true,
                active: true,
                openai_compatible: {
                  base_url: 'http://192.168.1.8:8317',
                  model: 'gpt-5.4',
                  chat_models: ['gpt-5.4', 'claude-sonnet-4-6'],
                },
                created_at: '2026-04-24T10:00:00Z',
                updated_at: '2026-04-24T10:00:00Z',
              },
            ],
            active_provider_id: 'provider-http',
            supported_kinds: ['codex', 'claude', 'openai-compatible'],
          }),
        }
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Provider switch test',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:00Z',
            message_count: 0,
          },
        ])
      }

      throw new Error(`Unhandled fetch in provider switch test: ${url}`)
    })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'AI provider' })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'AI provider' })).toHaveValue('provider-stub')
      expect(screen.getByRole('combobox', { name: 'AI model' })).toHaveValue('stub-model')
    })

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: 'AI provider' }), {
        target: { value: 'provider-http' },
      })
    })

    const providerActiveCall = await waitFor(() => {
      const match = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('/api/v1/agent/providers/active'),
      )
      expect(match).toBeDefined()
      return match
    })

    expect(JSON.parse(String(providerActiveCall?.[1]?.body))).toEqual({
      id: 'provider-http',
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'AI model' })).toHaveValue('gpt-5.4')
    })

    const modelSelect = screen.getByRole('combobox', { name: 'AI model' })
    expect(modelSelect).toHaveTextContent('gpt-5.4')
    expect(modelSelect).toHaveTextContent('claude-sonnet-4-6')
  })

  it('streams pure chat prompts without plan or approval gates', async () => {
    registerTerminalPanelBinding({
      hostId: 'terminal',
      preset: 'workspace',
      runtimeWidgetId: 'term-side',
    })
    setActiveWidgetHostId('terminal')

    const streamResponse = createDeferredStreamResponse()
    const fetchMock = vi.fn()
    let isConversationComplete = false
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return isConversationComplete
          ? createConversationFetchResponse(
              {
                title: 'Pure chat',
                updated_at: '2026-04-21T10:00:05Z',
              },
              [
                {
                  id: 'msg_user',
                  role: 'user',
                  content: 'Привет',
                  status: 'complete',
                  created_at: '2026-04-21T10:00:00Z',
                },
                {
                  id: 'msg_2',
                  role: 'assistant',
                  content: 'Backend message received.',
                  status: 'complete',
                  provider: 'stub',
                  model: 'stub-model',
                  created_at: '2026-04-21T10:00:05Z',
                },
              ],
            )
          : createConversationFetchResponse({
              title: 'Pure chat',
              provider: {
                kind: 'stub',
                base_url: 'http://stub',
                model: 'stub-model',
                streaming: false,
              },
            })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Pure chat',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: isConversationComplete ? '2026-04-21T10:00:05Z' : '2026-04-21T10:00:00Z',
            message_count: isConversationComplete ? 2 : 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/agent/conversation/messages/stream')) {
        return {
          ok: true,
          body: streamResponse.body,
        }
      }

      throw new Error(`Unexpected fetch request: ${url}`)
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

    const streamCall = await waitFor(() => {
      const match = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
      )
      expect(match).toBeDefined()
      return match
    })
    expect(JSON.parse(String(streamCall?.[1]?.body))).toEqual({
      prompt: 'Привет',
      model: 'stub-model',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'term-side',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_ids: ['term-side'],
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
      isConversationComplete = true
      streamResponse.close()
    })

    await waitFor(() => {
      expect(screen.getByText('Backend message received.')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByLabelText('Widget ai-shell-panel is busy')).not.toBeInTheDocument()
    })
  })

  it('lets the operator cancel an active backend response stream', async () => {
    const streamResponse = createDeferredStreamResponse()
    const fetchMock = vi.fn()
    let streamSignal: AbortSignal | null = null

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Cancelable stream',
          provider: {
            kind: 'stub',
            base_url: 'http://stub',
            model: 'stub-model',
            streaming: true,
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Cancelable stream',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:00Z',
            message_count: 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/agent/conversation/messages/stream')) {
        streamSignal = init?.signal instanceof AbortSignal ? init.signal : null
        return {
          ok: true,
          body: streamResponse.body,
        }
      }

      throw new Error(`Unexpected fetch request: ${url}`)
    })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Text Area'), {
      target: { value: 'Cancel this response' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel response' })).toBeInTheDocument()
      expect(streamSignal).not.toBeNull()
    })

    await act(async () => {
      streamResponse.push(
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.push(
        'event: text-delta\ndata: {"type":"text-delta","message_id":"msg_2","delta":"Partial reply"}\n\n',
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Partial reply')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel response' }))

    expect(streamSignal?.aborted).toBe(true)
    await waitFor(() => {
      expect(screen.queryByLabelText('Widget ai-shell-panel is busy')).not.toBeInTheDocument()
      expect(screen.getByText('stub-model · error')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Cancel response' })).not.toBeInTheDocument()
  })

  it('allows selecting multiple workspace widgets for the AI request context', async () => {
    registerTerminalPanelBinding({
      hostId: 'terminal',
      preset: 'workspace',
      runtimeWidgetId: 'term-side',
    })
    setActiveWidgetHostId('terminal')

    const streamResponse = createDeferredStreamResponse()
    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Context selection',
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Context selection',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:00Z',
            message_count: 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/workspace')) {
        return {
          ok: true,
          json: async () => ({
            id: 'ws-local',
            name: 'Local Workspace',
            active_widget_id: 'term-side',
            widgets: [
              {
                id: 'term-main',
                kind: 'terminal',
                title: 'Main Shell',
                connection_id: 'local',
              },
              {
                id: 'term-side',
                kind: 'terminal',
                title: 'Ops Shell',
                connection_id: 'local',
              },
            ],
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation/messages/stream')) {
        return {
          ok: true,
          body: streamResponse.body,
        }
      }

      throw new Error(`Unexpected fetch request: ${url}`)
    })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Composer options'))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Context widgets' })).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Main Shell/ })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('option', { name: /Main Shell/ }))
    fireEvent.click(screen.getByLabelText('Composer options'))
    fireEvent.change(screen.getByPlaceholderText('Text Area'), {
      target: { value: 'Привет с контекстом' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    const streamCall = await waitFor(() => {
      const match = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
      )
      expect(match).toBeDefined()
      return match
    })
    expect(JSON.parse(String(streamCall?.[1]?.body))).toEqual({
      prompt: 'Привет с контекстом',
      model: 'stub-model',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'term-side',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_ids: ['term-side', 'term-main'],
        widget_context_enabled: true,
      },
    })
  })

  it('persists the current workspace widget when the operator clicks Only current immediately after opening context options', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Current widget context',
          context_preferences: {
            widget_context_enabled: true,
            widget_ids: [],
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Current widget context',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:01Z',
            message_count: 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/workspace')) {
        return {
          ok: true,
          json: async () => ({
            id: 'ws-local',
            name: 'Local Workspace',
            active_widget_id: 'term-main',
            widgets: [
              {
                id: 'term-main',
                kind: 'terminal',
                title: 'Main Shell',
                connection_id: 'local',
              },
              {
                id: 'term-side',
                kind: 'terminal',
                title: 'Ops Shell',
                connection_id: 'local',
              },
            ],
          }),
        }
      }

      if (url.includes('/api/v1/agent/conversations/conv_1/context')) {
        return createConversationFetchResponse({
          title: 'Current widget context',
          context_preferences: {
            widget_context_enabled: true,
            widget_ids: ['term-main'],
          },
          updated_at: '2026-04-21T10:00:01Z',
        })
      }

      throw new Error(`Unexpected fetch request: ${url}`)
    })

    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Composer options'))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Context widgets' })).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Only current' })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Only current' }))

    await waitFor(() => {
      const contextUpdateCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes('/api/v1/agent/conversations/conv_1/context'),
      )
      expect(contextUpdateCall).toBeDefined()
      expect(JSON.parse(String(contextUpdateCall?.[1]?.body))).toEqual({
        widget_context_enabled: true,
        widget_ids: ['term-main'],
      })
    })
  })

  it('auto-saves stale persisted context when context widgets are opened', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Stale widget context',
          context_preferences: {
            widget_context_enabled: true,
            widget_ids: ['term-main', 'missing-widget-a', 'missing-widget-b'],
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations/conv_1/context')) {
        return createConversationFetchResponse({
          title: 'Stale widget context',
          context_preferences: {
            widget_context_enabled: true,
            widget_ids: ['term-main'],
          },
        })
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Stale widget context',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:00Z',
            message_count: 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/workspace')) {
        return {
          ok: true,
          json: async () => ({
            active_widget_id: 'term-main',
            tabs: [
              {
                id: 'tab_1',
                widget_id: 'term-main',
                kind: 'terminal',
                title: 'Main Shell',
                connection_id: 'local',
                path: '/Users/avm/projects/runa-terminal',
              },
            ],
            widgets: [
              {
                id: 'term-main',
                kind: 'terminal',
                title: 'Main Shell',
                connection_id: 'local',
                path: '/Users/avm/projects/runa-terminal',
              },
            ],
          }),
        }
      }

      throw new Error(`Unhandled fetch in stale widget context test: ${url}`)
    })

    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('2 saved widgets are no longer available in this workspace.')).toBeVisible()
    })

    fireEvent.click(screen.getByLabelText('Composer options'))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Context widgets' })).toBeInTheDocument()
    })

    await waitFor(() => {
      const contextUpdateCalls = fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes('/api/v1/agent/conversations/conv_1/context'),
      )
      expect(contextUpdateCalls).toHaveLength(1)
      expect(JSON.parse(String(contextUpdateCalls[0]?.[1]?.body))).toEqual({
        widget_context_enabled: true,
        widget_ids: ['term-main'],
      })
    })

    await waitFor(() => {
      expect(
        screen.queryByText('2 saved widgets are no longer available in this workspace.'),
      ).not.toBeInTheDocument()
    })
  })

  it('clears busy state and keeps partial assistant output coherent on backend error events', async () => {
    const streamResponse = createDeferredStreamResponse()
    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Backend error',
          provider: {
            kind: 'stub',
            base_url: 'http://stub',
            model: 'stub-model',
            streaming: true,
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Backend error',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:00Z',
            message_count: 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/agent/conversation/messages/stream')) {
        return {
          ok: true,
          body: streamResponse.body,
        }
      }

      throw new Error(`Unexpected fetch request: ${url}`)
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
    let isConversationComplete = false
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return isConversationComplete
          ? createConversationFetchResponse(
              {
                title: 'Plan flow',
                updated_at: '2026-04-21T10:00:05Z',
              },
              [
                {
                  id: 'msg_user',
                  role: 'user',
                  content: 'Deploy the current config',
                  status: 'complete',
                  created_at: '2026-04-21T10:00:00Z',
                },
                {
                  id: 'msg_2',
                  role: 'assistant',
                  content: 'Deployment queued.',
                  status: 'complete',
                  provider: 'stub',
                  model: 'stub-model',
                  created_at: '2026-04-21T10:00:05Z',
                },
              ],
            )
          : createConversationFetchResponse({
              title: 'Plan flow',
              provider: {
                kind: 'stub',
                base_url: 'http://stub',
                model: 'stub-model',
                streaming: false,
              },
            })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Plan flow',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: isConversationComplete ? '2026-04-21T10:00:05Z' : '2026-04-21T10:00:00Z',
            message_count: isConversationComplete ? 2 : 0,
          },
        ])
      }

      if (url.endsWith('/api/v1/agent/conversation/messages/stream')) {
        return {
          ok: true,
          body: streamResponse.body,
        }
      }

      throw new Error(`Unexpected fetch request: ${url}`)
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

    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
      ),
    ).toBe(false)
    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(screen.getByText('Choose environment:')).toBeInTheDocument()
    expect(screen.queryByText('Plan')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Staging' }))

    expect(screen.getByText('Answer: staging')).toBeInTheDocument()
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
      ),
    ).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
        ),
      ).toBe(true)
    })

    await act(async () => {
      streamResponse.push(
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      streamResponse.push(
        'event: message-complete\ndata: {"type":"message-complete","message_id":"msg_2","message":{"id":"msg_2","role":"assistant","content":"Deployment queued.","status":"complete","provider":"stub","model":"stub-model","created_at":"2026-04-21T10:00:05Z"}}\n\n',
      )
      isConversationComplete = true
      streamResponse.close()
    })

    await waitFor(() => {
      expect(screen.getByText('Deployment queued.')).toBeInTheDocument()
    })
  })

  it('stops the flow when approval is cancelled', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Cancel flow',
          provider: {
            kind: 'stub',
            base_url: 'http://stub',
            model: 'stub-model',
            streaming: false,
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse()
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Cancel flow',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:00Z',
            message_count: 0,
          },
        ])
      }

      throw new Error(`Unexpected fetch request: ${url}`)
    })
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
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
      ),
    ).toBe(false)
  })

  it('routes /run prompts into terminal execution instead of provider chat streaming', async () => {
    registerTerminalPanelBinding({
      hostId: 'terminal',
      preset: 'workspace',
      runtimeWidgetId: 'term-side',
    })
    setActiveWidgetHostId('terminal')

    const fetchMock = vi.fn()
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/v1/bootstrap')) {
        return {
          ok: true,
          json: async () => ({
            home_dir: '/Users/avm',
            repo_root: '/Users/avm/projects/runa-terminal',
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/conversation')) {
        return createConversationFetchResponse({
          title: 'Run flow',
          provider: {
            kind: 'codex',
            base_url: 'http://codex',
            model: 'stub-model',
            streaming: false,
          },
        })
      }

      if (url.endsWith('/api/v1/agent/providers')) {
        return createProviderCatalogFetchResponse(
          ['stub-model'],
          [
            {
              id: 'provider-stub',
              kind: 'codex',
              display_name: 'Stub Codex CLI',
              enabled: true,
              active: true,
              codex: {
                command: 'codex',
                model: 'stub-model',
                chat_models: ['stub-model'],
                status_state: 'ready',
              },
              created_at: '2026-04-21T10:00:00Z',
              updated_at: '2026-04-21T10:00:00Z',
            },
          ],
        )
      }

      if (url.includes('/api/v1/agent/conversations?scope=recent')) {
        return createConversationListFetchResponse('conv_1', [
          {
            id: 'conv_1',
            title: 'Run flow',
            created_at: '2026-04-21T09:59:00Z',
            updated_at: '2026-04-21T10:00:02Z',
            message_count: 3,
          },
        ])
      }

      if (url.endsWith('/api/v1/terminal/term-side')) {
        return {
          ok: true,
          json: async () => ({
            state: {
              widget_id: 'term-side',
              session_id: 'term-side',
              shell: '/bin/zsh',
              connection_id: 'local',
              connection_kind: 'local',
              pid: 100,
              status: 'running',
              started_at: '2026-04-21T10:00:00Z',
              can_send_input: true,
              can_interrupt: true,
            },
            chunks: [],
            next_seq: 4,
          }),
        }
      }

      if (url.endsWith('/api/v1/tools/execute')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            output: {
              append_newline: true,
              bytes_sent: 11,
              widget_id: 'term-side',
            },
          }),
        }
      }

      if (url.endsWith('/api/v1/terminal/term-side?from=4')) {
        return {
          ok: true,
          json: async () => ({
            state: {
              widget_id: 'term-side',
              session_id: 'term-side',
              shell: '/bin/zsh',
              connection_id: 'local',
              connection_kind: 'local',
              pid: 100,
              status: 'running',
              started_at: '2026-04-21T10:00:00Z',
              can_send_input: true,
              can_interrupt: true,
            },
            chunks: [
              {
                seq: 4,
                data: 'run-widget-test\n',
                timestamp: '2026-04-21T10:00:01Z',
              },
            ],
            next_seq: 5,
          }),
        }
      }

      if (url.endsWith('/api/v1/agent/terminal-commands/explain')) {
        return {
          ok: true,
          json: async () => ({
            conversation: {
              id: 'conv_1',
              title: 'Run flow',
              messages: [
                {
                  id: 'msg_user',
                  role: 'user',
                  content: '/run echo run-widget-test',
                  status: 'complete',
                  created_at: '2026-04-21T10:00:00Z',
                },
                {
                  id: 'msg_exec',
                  role: 'assistant',
                  content: 'Executed `echo run-widget-test`.\n\n```text\nrun-widget-test\n```',
                  status: 'complete',
                  provider: 'codex',
                  model: 'stub-model',
                  created_at: '2026-04-21T10:00:01Z',
                },
                {
                  id: 'msg_explain',
                  role: 'assistant',
                  content: 'Ran `echo run-widget-test` and got the expected output.',
                  status: 'complete',
                  provider: 'codex',
                  model: 'stub-model',
                  created_at: '2026-04-21T10:00:02Z',
                },
              ],
              provider: {
                kind: 'codex',
                base_url: 'http://codex',
                model: 'stub-model',
                streaming: false,
              },
              created_at: '2026-04-21T09:59:00Z',
              updated_at: '2026-04-21T10:00:02Z',
            },
            provider_error: '',
            output_excerpt: 'run-widget-test',
          }),
        }
      }

      throw new Error(`Unexpected fetch request: ${url}`)
    })
    vi.stubEnv('VITE_RTERM_API_BASE', 'http://127.0.0.1:8090')
    vi.stubEnv('VITE_RTERM_AUTH_TOKEN', 'runtime-token')
    vi.stubGlobal('fetch', fetchMock)

    render(<AiPanelWidget hostId="ai-shell-panel" />)

    await waitFor(() => {
      expect(screen.getByText('Backend conversation is empty.')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Text Area'), {
      target: { value: '/run echo run-widget-test' },
    })
    fireEvent.click(screen.getByLabelText('Send prompt'))

    await waitFor(() => {
      expect(
        screen.getByText((value) => value.includes('Executed `echo run-widget-test`')),
      ).toBeInTheDocument()
    })

    expect(screen.getByText('Ran `echo run-widget-test` and got the expected output.')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/api/v1/agent/conversation/messages/stream'),
      ),
    ).toBe(false)
    const terminalSnapshotCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith('/api/v1/terminal/term-side'),
    )
    const toolExecuteCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/v1/tools/execute'),
    )
    const terminalFromSeqCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/v1/terminal/term-side?from=4'),
    )
    const explainCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('/api/v1/agent/terminal-commands/explain'),
    )

    expect(terminalSnapshotCall?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-side')
    expect(toolExecuteCall?.[0]).toBe('http://127.0.0.1:8090/api/v1/tools/execute')
    expect(terminalFromSeqCall?.[0]).toBe('http://127.0.0.1:8090/api/v1/terminal/term-side?from=4')
    expect(explainCall?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/terminal-commands/explain')
    expect(JSON.parse(String(toolExecuteCall?.[1]?.body))).toEqual({
      context: {
        action_source: 'frontend.ai.sidebar.run',
        active_widget_id: 'term-side',
        repo_root: '/Users/avm/projects/runa-terminal',
        target_connection_id: 'local',
        target_session: 'local',
      },
      input: {
        append_newline: true,
        text: 'echo run-widget-test',
        widget_id: 'term-side',
      },
      tool_name: 'term.send_input',
    })
    expect(JSON.parse(String(explainCall?.[1]?.body))).toEqual({
      command: 'echo run-widget-test',
      context: {
        action_source: 'frontend.ai.sidebar.run',
        active_widget_id: 'term-side',
        repo_root: '/Users/avm/projects/runa-terminal',
        target_connection_id: 'local',
        target_session: 'local',
        widget_ids: ['term-side'],
        widget_context_enabled: true,
      },
      from_seq: 4,
      prompt: '/run echo run-widget-test',
      widget_id: 'term-side',
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
