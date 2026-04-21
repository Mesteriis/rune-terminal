import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resetRuntimeContextCacheForTests } from '@/shared/api/runtime'
import { AiPanelWidget } from '@/widgets/ai/ai-panel-widget'

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
      expect(screen.getByText('User 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Inspect the backend contract')).toBeInTheDocument()
    expect(screen.getByText('Assistant 2')).toBeInTheDocument()
    expect(screen.getByText('The backend contract is ready.')).toBeInTheDocument()
  })

  it('submits messages through the existing composer send path', async () => {
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
        json: async () => ({
          conversation: {
            messages: [
              {
                id: 'msg_1',
                role: 'user',
                content: 'Send this to the backend',
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
            provider: {
              kind: 'stub',
              base_url: 'http://stub',
              model: 'stub-model',
              streaming: false,
            },
            updated_at: '2026-04-21T10:00:05Z',
          },
          provider_error: '',
        }),
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
      expect(screen.getByText('Backend message received.')).toBeInTheDocument()
    })

    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://127.0.0.1:8090/api/v1/agent/conversation/messages')
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      prompt: 'Send this to the backend',
      context: {
        action_source: 'frontend.ai.sidebar',
        active_widget_id: 'ai-shell-panel',
        repo_root: '/Users/avm/projects/runa-terminal',
        widget_context_enabled: true,
      },
    })
  })
})
