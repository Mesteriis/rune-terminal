import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchRemoteProfiles, importSSHConfigProfiles } from '@/features/remote/api/client'
import { RemoteProfilesSettingsSection } from './remote-profiles-settings-section'

vi.mock('@/features/remote/api/client', () => ({
  fetchRemoteProfiles: vi.fn(),
  importSSHConfigProfiles: vi.fn(),
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

  it('renders import errors inline', async () => {
    vi.mocked(fetchRemoteProfiles).mockResolvedValue([])
    vi.mocked(importSSHConfigProfiles).mockRejectedValue(new Error('ssh config not found'))

    render(<RemoteProfilesSettingsSection />)

    await expect(screen.findByText('No saved SSH profiles yet.')).resolves.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Import SSH config' }))

    await expect(screen.findByText('ssh config not found')).resolves.toBeInTheDocument()
  })
})
