import { describe, expect, it, vi } from 'vitest'

import { createRemoteProfileSession } from '@/features/remote/api/client'
import { openRemoteProfileSession } from './open-remote-profile-session'

vi.mock('@/features/remote/api/client', () => ({
  createRemoteProfileSession: vi.fn(),
}))

describe('openRemoteProfileSession', () => {
  it('adds a new workspace terminal panel when the remote widget is not visible', async () => {
    vi.mocked(createRemoteProfileSession).mockResolvedValue({
      connection_id: 'conn-prod',
      profile_id: 'conn-prod',
      reused: false,
      session_id: 'term-remote',
      tab_id: 'tab-remote',
      widget_id: 'term-remote',
    })

    const setActive = vi.fn()
    const addPanel = vi.fn(() => ({ api: { setActive } }))
    const api = {
      activePanel: {
        id: 'terminal',
        params: { preset: 'workspace', title: 'Workspace shell', widgetId: 'term-side' },
      },
      addPanel,
      getPanel: vi.fn(() => null),
      panels: [],
    }

    await openRemoteProfileSession(api as never, {
      profileId: 'conn-prod',
      title: 'Prod',
      tmuxSession: 'prod-main',
    })

    expect(createRemoteProfileSession).toHaveBeenCalledWith('conn-prod', {
      title: 'Prod',
      tmux_session: 'prod-main',
    })
    expect(addPanel).toHaveBeenCalledTimes(1)
    expect(setActive).toHaveBeenCalledTimes(1)
  })

  it('focuses an existing visible terminal panel when the widget is already mounted', async () => {
    vi.mocked(createRemoteProfileSession).mockResolvedValue({
      connection_id: 'conn-prod',
      profile_id: 'conn-prod',
      reused: true,
      session_id: 'term-remote',
      tab_id: 'tab-remote',
      widget_id: 'term-remote',
    })

    const setActive = vi.fn()
    const api = {
      activePanel: null,
      addPanel: vi.fn(),
      getPanel: vi.fn(() => null),
      panels: [
        {
          id: 'terminal-2',
          params: { preset: 'workspace', title: 'Workspace shell 2', widgetId: 'term-remote' },
          api: { setActive },
        },
      ],
    }

    await openRemoteProfileSession(api as never, {
      profileId: 'conn-prod',
      title: 'Prod',
    })

    expect(api.addPanel).not.toHaveBeenCalled()
    expect(setActive).toHaveBeenCalledTimes(1)
  })
})
