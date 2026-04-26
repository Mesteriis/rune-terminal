import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  deleteRemoteProfile,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  saveRemoteProfile,
} from '@/features/remote/api/client'
import { RemoteProfilesSettingsSection } from './remote-profiles-settings-section'

vi.mock('@/features/remote/api/client', () => ({
  deleteRemoteProfile: vi.fn(),
  fetchRemoteProfiles: vi.fn(),
  importSSHConfigProfiles: vi.fn(),
  saveRemoteProfile: vi.fn(),
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

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('prod')).resolves.toBeInTheDocument()
    expect(screen.getByText('deploy@prod.example.com:2222')).toBeInTheDocument()
  })

  it('imports ssh config profiles and refreshes the visible list', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([])
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
    vi.mocked(saveRemoteProfile).mockResolvedValue({
      profile: {
        host: 'prod.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod',
        name: 'Prod',
        port: 2222,
        user: 'deploy',
      },
      profiles: [
        {
          host: 'prod.example.com',
          id: 'conn-prod',
          identity_file: '~/.ssh/id_prod',
          name: 'Prod',
          port: 2222,
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
    fireEvent.click(screen.getByRole('button', { name: 'Save remote profile' }))

    await waitFor(() => {
      expect(saveRemoteProfile).toHaveBeenCalledWith({
        host: 'prod.example.com',
        id: undefined,
        identity_file: '~/.ssh/id_prod',
        name: 'Prod',
        port: 2222,
        user: 'deploy',
      })
      expect(screen.getByText('Saved Prod.')).toBeInTheDocument()
      expect(screen.getByText('deploy@prod.example.com:2222')).toBeInTheDocument()
    })
  })

  it('loads an existing profile into edit mode and saves changes', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([
      {
        host: 'prod.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod',
        name: 'Prod',
        port: 2222,
        user: 'deploy',
      },
    ])
    vi.mocked(saveRemoteProfile).mockResolvedValue({
      profile: {
        host: 'prod-v2.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod_v2',
        name: 'Prod 2',
        port: 2200,
        user: 'deploy',
      },
      profiles: [
        {
          host: 'prod-v2.example.com',
          id: 'conn-prod',
          identity_file: '~/.ssh/id_prod_v2',
          name: 'Prod 2',
          port: 2200,
          user: 'deploy',
        },
      ],
    })

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('Prod')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('textbox', { name: 'Remote profile name' })).toHaveValue('Prod')
    expect(screen.getByRole('textbox', { name: 'Remote profile host' })).toHaveValue('prod.example.com')

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
    fireEvent.click(screen.getByRole('button', { name: 'Save remote profile changes' }))

    await waitFor(() => {
      expect(saveRemoteProfile).toHaveBeenCalledWith({
        host: 'prod-v2.example.com',
        id: 'conn-prod',
        identity_file: '~/.ssh/id_prod_v2',
        name: 'Prod 2',
        port: 2200,
        user: 'deploy',
      })
      expect(screen.getByText('Saved Prod 2.')).toBeInTheDocument()
      expect(screen.getByText('deploy@prod-v2.example.com:2200')).toBeInTheDocument()
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
    vi.mocked(importSSHConfigProfiles).mockRejectedValue(new Error('ssh config not found'))

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('No saved SSH profiles yet.')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Import SSH config' }))

    await expect(screen.findByText('ssh config not found')).resolves.toBeInTheDocument()
  })
})
