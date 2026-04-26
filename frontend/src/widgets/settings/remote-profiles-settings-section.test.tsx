import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { openRemoteProfileSession } from '@/app/open-remote-profile-session'
import {
  checkRemoteProfileConnection,
  deleteRemoteProfile,
  fetchRemoteConnectionsSnapshot,
  fetchRemoteProfileTmuxSessions,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  saveRemoteProfile,
  selectRemoteProfileConnection,
} from '@/features/remote/api/client'
import { RemoteProfilesSettingsSection } from './remote-profiles-settings-section'

vi.mock('@/app/open-remote-profile-session', () => ({
  openRemoteProfileSession: vi.fn(),
}))

vi.mock('@/features/remote/api/client', () => ({
  checkRemoteProfileConnection: vi.fn(),
  deleteRemoteProfile: vi.fn(),
  fetchRemoteConnectionsSnapshot: vi.fn(),
  fetchRemoteProfileTmuxSessions: vi.fn(),
  fetchRemoteProfiles: vi.fn(),
  importSSHConfigProfiles: vi.fn(),
  saveRemoteProfile: vi.fn(),
  selectRemoteProfileConnection: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('RemoteProfilesSettingsSection', () => {
  it('loads and renders saved remote profiles', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'prod',
        port: 2222,
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'conn-prod',
      connections: [
        {
          active: true,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'prod',
          runtime: {
            check_status: 'passed',
            launch_status: 'idle',
          },
          usability: 'available',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('prod')).resolves.toBeInTheDocument()
    expect(screen.getByText('deploy@prod.example.com:2222')).toBeInTheDocument()
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('passed')).toBeInTheDocument()
    expect(screen.getByText('Last preflight passed.')).toBeInTheDocument()
    expect(screen.getByText('1 saved')).toBeInTheDocument()
    expect(screen.getByText('1 default')).toBeInTheDocument()
  })

  it('filters the visible remote profile inventory', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        user: 'deploy',
      },
      {
        host: 'stage.example.com',
        id: 'conn-stage',
        name: 'Stage',
        user: 'qa',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'conn-prod',
      connections: [
        {
          active: true,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'Prod',
          runtime: {
            check_status: 'passed',
            launch_status: 'idle',
          },
          usability: 'available',
        },
        {
          active: false,
          id: 'conn-stage',
          kind: 'ssh',
          name: 'Stage',
          runtime: {
            check_status: 'failed',
            launch_status: 'idle',
          },
          usability: 'error',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()
    await expect(screen.findByText('Stage')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter remote profiles' }), {
      target: { value: 'stage' },
    })

    expect(screen.getByText('2 saved')).toBeInTheDocument()
    expect(screen.getByText('1 visible')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
    expect(screen.queryByText('Prod')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter remote profiles' }), {
      target: { value: 'missing' },
    })

    expect(screen.getByText('No SSH profiles match current filter.')).toBeInTheDocument()
  })

  it('imports ssh config profiles and refreshes the visible list', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(importSSHConfigProfiles).mockResolvedValue({
      imported: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod' }],
      profiles: [{ host: 'prod.example.com', id: 'conn-prod', name: 'prod' }],
      skipped: [{ host: '*.internal', reason: 'unsupported_host_pattern' }],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('No saved SSH profiles yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'SSH config path' }), {
      target: { value: '/Users/avm/.ssh/config' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import SSH config' }))

    await waitFor(() => {
      expect(importSSHConfigProfiles).toHaveBeenCalledWith('/Users/avm/.ssh/config')
      expect(screen.getByText('Imported 1 profile; 1 host skipped.')).toBeInTheDocument()
      expect(screen.getByText('prod')).toBeInTheDocument()
      expect(screen.getByText('prod.example.com')).toBeInTheDocument()
    })
  })

  it('saves a new remote profile and refreshes the visible list', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(saveRemoteProfile).mockResolvedValue({
      profile: {
        host: 'prod.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod',
        launch_mode: 'tmux',
        name: 'Prod',
        port: 2222,
        tmux_session: 'prod-main',
        user: 'deploy',
      },
      profiles: [
        {
          host: 'prod.example.com',
          id: 'conn-prod',
          identity_file: '~/.ssh/id_prod',
          launch_mode: 'tmux',
          name: 'Prod',
          port: 2222,
          tmux_session: 'prod-main',
          user: 'deploy',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('No saved SSH profiles yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile name' }), {
      target: { value: 'Prod' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile host' }), {
      target: { value: 'prod.example.com' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile user' }), {
      target: { value: 'deploy' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile port' }), {
      target: { value: '2222' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile identity file' }), {
      target: { value: '~/.ssh/id_prod' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Resume remote shell through tmux' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile tmux session' }), {
      target: { value: 'prod-main' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save remote profile' }))

    await waitFor(() => {
      expect(saveRemoteProfile).toHaveBeenCalledWith({
        host: 'prod.example.com',
        id: undefined,
        identity_file: '~/.ssh/id_prod',
        launch_mode: 'tmux',
        name: 'Prod',
        port: 2222,
        tmux_session: 'prod-main',
        user: 'deploy',
      })
      expect(screen.getByText('Saved Prod.')).toBeInTheDocument()
      expect(screen.getByText('deploy@prod.example.com:2222')).toBeInTheDocument()
      expect(screen.getByText('tmux')).toBeInTheDocument()
      expect(screen.getByText('tmux resume: prod-main')).toBeInTheDocument()
    })
  })

  it('loads an existing profile into edit mode and saves changes', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod',
        launch_mode: 'tmux',
        name: 'Prod',
        port: 2222,
        tmux_session: 'prod-main',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(saveRemoteProfile).mockResolvedValue({
      profile: {
        host: 'prod-v2.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod_v2',
        launch_mode: 'tmux',
        name: 'Prod 2',
        port: 2200,
        tmux_session: 'prod-blue',
        user: 'deploy',
      },
      profiles: [
        {
          host: 'prod-v2.example.com',
          id: 'conn-prod',
          identity_file: '~/.ssh/id_prod_v2',
          launch_mode: 'tmux',
          name: 'Prod 2',
          port: 2200,
          tmux_session: 'prod-blue',
          user: 'deploy',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('textbox', { name: 'Remote profile name' })).toHaveValue('Prod')
    expect(screen.getByRole('textbox', { name: 'Remote profile host' })).toHaveValue('prod.example.com')
    expect(screen.getByRole('checkbox', { name: 'Resume remote shell through tmux' })).toBeChecked()
    expect(screen.getByRole('textbox', { name: 'Remote profile tmux session' })).toHaveValue('prod-main')

    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile name' }), {
      target: { value: 'Prod 2' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile host' }), {
      target: { value: 'prod-v2.example.com' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile port' }), {
      target: { value: '2200' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile identity file' }), {
      target: { value: '~/.ssh/id_prod_v2' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile tmux session' }), {
      target: { value: 'prod-blue' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save remote profile changes' }))

    await waitFor(() => {
      expect(saveRemoteProfile).toHaveBeenCalledWith({
        host: 'prod-v2.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod_v2',
        launch_mode: 'tmux',
        name: 'Prod 2',
        port: 2200,
        tmux_session: 'prod-blue',
        user: 'deploy',
      })
      expect(screen.getByText('Saved Prod 2.')).toBeInTheDocument()
      expect(screen.getByText('deploy@prod-v2.example.com:2200')).toBeInTheDocument()
      expect(screen.getByText('tmux resume: prod-blue')).toBeInTheDocument()
    })
  })

  it('deletes remote profiles from the visible list', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        port: 2222,
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(deleteRemoteProfile).mockResolvedValue({ profiles: [] })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteRemoteProfile).toHaveBeenCalledWith('conn-prod')
      expect(screen.getByText('Deleted SSH profile.')).toBeInTheDocument()
      expect(screen.getByText('No saved SSH profiles yet.')).toBeInTheDocument()
    })
  })

  it('renders import errors inline', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(importSSHConfigProfiles).mockRejectedValue(new Error('ssh config not found'))

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('No saved SSH profiles yet.')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Import SSH config' }))

    await expect(screen.findByText('ssh config not found')).resolves.toBeInTheDocument()
  })

  it('runs preflight checks for saved remote profiles', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [
        {
          active: false,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'Prod',
          runtime: {
            check_status: 'unchecked',
            launch_status: 'idle',
          },
          usability: 'unknown',
        },
      ],
    })
    vi.mocked(checkRemoteProfileConnection).mockResolvedValue({
      connection: {
        active: false,
        id: 'conn-prod',
        kind: 'ssh',
        name: 'Prod',
        runtime: {
          check_status: 'passed',
          launch_status: 'idle',
        },
        usability: 'available',
      },
      connections: {
        active_connection_id: 'local',
        connections: [
          {
            active: false,
            id: 'conn-prod',
            kind: 'ssh',
            name: 'Prod',
            runtime: {
              check_status: 'passed',
              launch_status: 'idle',
            },
            usability: 'available',
          },
        ],
      },
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    await waitFor(() => {
      expect(checkRemoteProfileConnection).toHaveBeenCalledWith('conn-prod')
      expect(screen.getByText('Prod: preflight passed.')).toBeInTheDocument()
      expect(screen.getByText('available')).toBeInTheDocument()
      expect(screen.getByText('Last preflight passed.')).toBeInTheDocument()
    })
  })

  it('marks a saved profile as the default connection', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(selectRemoteProfileConnection).mockResolvedValue({
      active_connection_id: 'conn-prod',
      connections: [
        {
          active: true,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'Prod',
          runtime: {
            check_status: 'unchecked',
            launch_status: 'idle',
          },
          usability: 'unknown',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Set default' }))

    await waitFor(() => {
      expect(selectRemoteProfileConnection).toHaveBeenCalledWith('conn-prod')
      expect(screen.getByText('Default connection: Prod.')).toBeInTheDocument()
      expect(screen.getByText('default')).toBeInTheDocument()
    })
  })

  it('shows launch failure details and launch status badges for saved profiles', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [
        {
          active: false,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'Prod',
          runtime: {
            check_status: 'passed',
            launch_error: 'SSH authentication failed. Check the username, key, agent, or passphrase setup.',
            launch_status: 'failed',
          },
          usability: 'attention',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()
    expect(
      screen.getByText('SSH authentication failed. Check the username, key, agent, or passphrase setup.'),
    ).toBeInTheDocument()
    expect(screen.getByText('launch:failed')).toBeInTheDocument()
  })

  it('shows launch success status after a shell was opened successfully', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [
        {
          active: false,
          id: 'conn-prod',
          kind: 'ssh',
          name: 'Prod',
          runtime: {
            check_status: 'passed',
            launch_status: 'succeeded',
          },
          usability: 'available',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()
    expect(screen.getByText('Last shell launch succeeded.')).toBeInTheDocument()
    expect(screen.getByText('launch:succeeded')).toBeInTheDocument()
  })

  it('opens a remote shell from a saved profile', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        name: 'Prod',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(openRemoteProfileSession).mockResolvedValue({
      connection_id: 'conn-prod',
      profile_id: 'conn-prod',
      reused: false,
      session_id: 'term-remote',
      tab_id: 'tab-remote',
      widget_id: 'term-remote',
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open shell' }))

    await waitFor(() => {
      expect(openRemoteProfileSession).toHaveBeenCalledWith(null, {
        profileId: 'conn-prod',
        title: 'Prod',
        tmuxSession: undefined,
      })
      expect(screen.getByText('Opened remote shell for Prod.')).toBeInTheDocument()
    })
  })

  it('browses tmux sessions for tmux-backed remote profiles and loads a selected session into edit mode', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        launch_mode: 'tmux',
        name: 'Prod',
        tmux_session: 'prod-main',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(fetchRemoteProfileTmuxSessions).mockResolvedValue([
      { attached: true, name: 'prod-main', window_count: 2 },
      { attached: false, name: 'prod-jobs', window_count: 1 },
    ])

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Browse tmux' }))

    await waitFor(() => {
      expect(fetchRemoteProfileTmuxSessions).toHaveBeenCalledWith('conn-prod')
      expect(screen.getByText('prod-main · attached · 2 windows')).toBeInTheDocument()
      expect(screen.getByText('prod-jobs · detached · 1 windows')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Use session' })[1]!)

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Resume remote shell through tmux' })).toBeChecked()
      expect(screen.getByRole('textbox', { name: 'Remote profile tmux session' })).toHaveValue('prod-jobs')
      expect(screen.getByText('Loaded tmux session prod-jobs into profile editor.')).toBeInTheDocument()
    })
  })

  it('resumes a discovered tmux session directly from the profile row', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        launch_mode: 'tmux',
        name: 'Prod',
        tmux_session: 'prod-main',
        user: 'deploy',
      },
    ])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(fetchRemoteProfileTmuxSessions).mockResolvedValue([
      { attached: true, name: 'prod-main', window_count: 2 },
      { attached: false, name: 'prod-jobs', window_count: 1 },
    ])
    vi.mocked(openRemoteProfileSession).mockResolvedValue({
      connection_id: 'conn-prod',
      profile_id: 'conn-prod',
      remote_session_name: 'prod-jobs',
      reused: false,
      session_id: 'term-remote',
      tab_id: 'tab-remote',
      widget_id: 'term-remote',
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Browse tmux' }))

    await waitFor(() => {
      expect(screen.getByText('prod-jobs · detached · 1 windows')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Resume session' })[1]!)

    await waitFor(() => {
      expect(openRemoteProfileSession).toHaveBeenCalledWith(null, {
        profileId: 'conn-prod',
        title: 'Prod',
        tmuxSession: 'prod-jobs',
      })
      expect(screen.getByText('Opened Prod on tmux session prod-jobs.')).toBeInTheDocument()
    })
  })

  it('derives tmux session names on save when tmux resume is enabled without an explicit name', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([])
    vi.mocked(fetchRemoteConnectionsSnapshot).mockResolvedValue({
      active_connection_id: 'local',
      connections: [],
    })
    vi.mocked(saveRemoteProfile).mockResolvedValue({
      profile: {
        host: 'prod.example.com',
        id: 'conn-prod',
        launch_mode: 'tmux',
        name: 'Prod Primary',
        tmux_session: 'Prod-Primary',
      },
      profiles: [
        {
          host: 'prod.example.com',
          id: 'conn-prod',
          launch_mode: 'tmux',
          name: 'Prod Primary',
          tmux_session: 'Prod-Primary',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('No saved SSH profiles yet.')).resolves.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile name' }), {
      target: { value: 'Prod Primary' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Remote profile host' }), {
      target: { value: 'prod.example.com' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Resume remote shell through tmux' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save remote profile' }))

    await waitFor(() => {
      expect(saveRemoteProfile).toHaveBeenCalledWith({
        host: 'prod.example.com',
        id: undefined,
        identity_file: '',
        launch_mode: 'tmux',
        name: 'Prod Primary',
        port: undefined,
        tmux_session: '',
        user: '',
      })
      expect(screen.getByText('tmux resume: Prod-Primary')).toBeInTheDocument()
    })
  })
})
