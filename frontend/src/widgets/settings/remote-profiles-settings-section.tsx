import { useEffect, useMemo, useState } from 'react'

import {
  checkRemoteProfileConnection,
  deleteRemoteProfile,
  fetchRemoteConnectionsSnapshot,
  fetchRemoteProfileTmuxSessions,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  selectRemoteProfileConnection,
  saveRemoteProfile,
  type RemoteConnectionsSnapshot,
  type RemoteConnectionView,
  type RemoteProfile,
  type RemoteTmuxSession,
  type SSHConfigImportResult,
} from '@/features/remote/api/client'
import { ClearBox } from '@/shared/ui/components'
import { Button, Input, Text } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

function describeProfile(profile: RemoteProfile) {
  const userPrefix = profile.user ? `${profile.user}@` : ''
  const portSuffix = profile.port ? `:${profile.port}` : ''

  return `${userPrefix}${profile.host}${portSuffix}`
}

function summarizeImport(result: SSHConfigImportResult) {
  const importedCount = result.imported.length
  const skippedCount = result.skipped?.length ?? 0
  const importedLabel = importedCount === 1 ? 'profile' : 'profiles'
  const skippedLabel = skippedCount === 1 ? 'host skipped' : 'hosts skipped'

  if (skippedCount > 0) {
    return `Imported ${importedCount} ${importedLabel}; ${skippedCount} ${skippedLabel}.`
  }

  return `Imported ${importedCount} ${importedLabel}.`
}

function summarizeConnectionStatus(connection: RemoteConnectionView | undefined) {
  if (!connection) {
    return null
  }

  if (connection.runtime.check_status === 'failed') {
    return connection.runtime.check_error || 'Last preflight failed.'
  }
  if (connection.runtime.launch_status === 'failed') {
    return connection.runtime.launch_error || 'Last launch failed.'
  }
  if (connection.runtime.launch_status === 'succeeded') {
    return 'Last shell launch succeeded.'
  }
  if (connection.runtime.check_status === 'passed') {
    return 'Last preflight passed.'
  }

  return 'Not checked yet.'
}

function profileMatchesFilter(
  profile: RemoteProfile,
  connection: RemoteConnectionView | undefined,
  rawFilter: string,
) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  const fields = [
    profile.id,
    profile.name,
    profile.host,
    profile.user ?? '',
    profile.identity_file ?? '',
    profile.launch_mode ?? '',
    profile.tmux_session ?? '',
    profile.port ? String(profile.port) : '',
    connection?.usability ?? '',
    connection?.runtime.check_status ?? '',
    connection?.runtime.launch_status ?? '',
  ]

  return fields.some((field) => field.toLowerCase().includes(filter))
}

const defaultProfileDraft = {
  host: '',
  identityFile: '',
  launchMode: 'shell' as 'shell' | 'tmux',
  name: '',
  port: '',
  tmuxSession: '',
  user: '',
}

export function RemoteProfilesSettingsSection() {
  const [profiles, setProfiles] = useState<RemoteProfile[]>([])
  const [connectionsSnapshot, setConnectionsSnapshot] = useState<RemoteConnectionsSnapshot>({
    active_connection_id: 'local',
    connections: [],
  })
  const [nameDraft, setNameDraft] = useState(defaultProfileDraft.name)
  const [hostDraft, setHostDraft] = useState(defaultProfileDraft.host)
  const [userDraft, setUserDraft] = useState(defaultProfileDraft.user)
  const [portDraft, setPortDraft] = useState(defaultProfileDraft.port)
  const [identityFileDraft, setIdentityFileDraft] = useState(defaultProfileDraft.identityFile)
  const [launchModeDraft, setLaunchModeDraft] = useState<'shell' | 'tmux'>(defaultProfileDraft.launchMode)
  const [tmuxSessionDraft, setTmuxSessionDraft] = useState(defaultProfileDraft.tmuxSession)
  const [pathDraft, setPathDraft] = useState('')
  const [filterDraft, setFilterDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [busyProfileID, setBusyProfileID] = useState<string | null>(null)
  const [editingProfileID, setEditingProfileID] = useState<string | null>(null)
  const [tmuxSessionsByProfile, setTmuxSessionsByProfile] = useState<Record<string, RemoteTmuxSession[]>>({})
  const [tmuxLoadingProfileID, setTmuxLoadingProfileID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isEditing = editingProfileID !== null
  const canSaveProfile = hostDraft.trim() !== ''
  const visibleProfiles = useMemo(
    () =>
      profiles.filter((profile) =>
        profileMatchesFilter(
          profile,
          connectionsSnapshot.connections.find((item) => item.id === profile.id),
          filterDraft,
        ),
      ),
    [connectionsSnapshot.connections, filterDraft, profiles],
  )
  const defaultProfilesCount = profiles.filter(
    (profile) => connectionsSnapshot.active_connection_id === profile.id,
  ).length

  function resetProfileForm() {
    setEditingProfileID(null)
    setNameDraft(defaultProfileDraft.name)
    setHostDraft(defaultProfileDraft.host)
    setUserDraft(defaultProfileDraft.user)
    setPortDraft(defaultProfileDraft.port)
    setIdentityFileDraft(defaultProfileDraft.identityFile)
    setLaunchModeDraft(defaultProfileDraft.launchMode)
    setTmuxSessionDraft(defaultProfileDraft.tmuxSession)
  }

  async function loadProfilesAndConnections(options: { isCancelled?: () => boolean } = {}) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [nextProfiles, nextConnectionsSnapshot] = await Promise.all([
        fetchRemoteProfiles(),
        fetchRemoteConnectionsSnapshot(),
      ])
      if (options.isCancelled?.()) {
        return
      }

      setProfiles(nextProfiles)
      setConnectionsSnapshot(nextConnectionsSnapshot)
      setTmuxSessionsByProfile({})
    } catch (error) {
      if (options.isCancelled?.()) {
        return
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to load remote profiles')
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    void loadProfilesAndConnections({ isCancelled: () => cancelled })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleImport() {
    setIsImporting(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await importSSHConfigProfiles(pathDraft)
      setProfiles(result.profiles)
      setConnectionsSnapshot(await fetchRemoteConnectionsSnapshot())
      setStatusMessage(summarizeImport(result))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to import SSH config')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const normalizedPort = portDraft.trim()
    if (normalizedPort !== '' && (!/^\d+$/.test(normalizedPort) || Number(normalizedPort) <= 0)) {
      setErrorMessage('Port must be a positive integer.')
      setIsSavingProfile(false)
      return
    }

    try {
      const result = await saveRemoteProfile({
        host: hostDraft,
        id: editingProfileID ?? undefined,
        identity_file: identityFileDraft,
        launch_mode: launchModeDraft,
        name: nameDraft,
        port: normalizedPort === '' ? undefined : Number(normalizedPort),
        tmux_session: launchModeDraft === 'tmux' ? tmuxSessionDraft : undefined,
        user: userDraft,
      })
      setProfiles(result.profiles)
      setConnectionsSnapshot(await fetchRemoteConnectionsSnapshot())
      setStatusMessage(`Saved ${result.profile.name}.`)
      resetProfileForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save remote profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  function handleStartEdit(profile: RemoteProfile) {
    setEditingProfileID(profile.id)
    setNameDraft(profile.name)
    setHostDraft(profile.host)
    setUserDraft(profile.user ?? '')
    setPortDraft(profile.port ? String(profile.port) : '')
    setIdentityFileDraft(profile.identity_file ?? '')
    setLaunchModeDraft(profile.launch_mode === 'tmux' ? 'tmux' : 'shell')
    setTmuxSessionDraft(profile.tmux_session ?? '')
    setErrorMessage(null)
    setStatusMessage(null)
  }

  async function handleDeleteProfile(profileID: string) {
    setBusyProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await deleteRemoteProfile(profileID)
      setProfiles(Array.isArray(result.profiles) ? result.profiles : [])
      setConnectionsSnapshot(await fetchRemoteConnectionsSnapshot())
      if (editingProfileID === profileID) {
        resetProfileForm()
      }
      setStatusMessage('Deleted SSH profile.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete remote profile')
    } finally {
      setBusyProfileID(null)
    }
  }

  async function handleCheckProfile(profileID: string) {
    setBusyProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await checkRemoteProfileConnection(profileID)
      setConnectionsSnapshot(result.connections)
      setStatusMessage(`${result.connection.name}: preflight ${result.connection.runtime.check_status}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to check remote profile')
    } finally {
      setBusyProfileID(null)
    }
  }

  async function handleSetDefaultProfile(profileID: string) {
    setBusyProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const nextConnectionsSnapshot = await selectRemoteProfileConnection(profileID)
      setConnectionsSnapshot(nextConnectionsSnapshot)
      const selectedProfile = profiles.find((profile) => profile.id === profileID)
      setStatusMessage(`Default connection: ${selectedProfile?.name ?? profileID}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to set default connection')
    } finally {
      setBusyProfileID(null)
    }
  }

  async function handleBrowseTmuxSessions(profileID: string) {
    setTmuxLoadingProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const sessions = await fetchRemoteProfileTmuxSessions(profileID)
      setTmuxSessionsByProfile((current) => ({
        ...current,
        [profileID]: sessions,
      }))
      setStatusMessage(
        sessions.length > 0
          ? `Loaded ${sessions.length} tmux sessions.`
          : 'No tmux sessions reported by remote host.',
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load tmux sessions')
    } finally {
      setTmuxLoadingProfileID(null)
    }
  }

  function handleUseTmuxSession(profile: RemoteProfile, sessionName: string) {
    handleStartEdit(profile)
    setLaunchModeDraft('tmux')
    setTmuxSessionDraft(sessionName)
    setStatusMessage(`Loaded tmux session ${sessionName} into profile editor.`)
  }

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Remote profiles</Text>
        <Text style={settingsShellMutedTextStyle}>
          Saved SSH targets are backend-owned. You can keep a narrow saved profile inventory here and
          separately import concrete aliases from `~/.ssh/config`, including `Include`, wildcard-host
          defaults, and `Match host/originalhost` overrides.
        </Text>
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)', gridTemplateColumns: '1fr 1.2fr' }}>
        <Input
          aria-label="Remote profile name"
          onChange={(event) => setNameDraft(event.target.value)}
          placeholder="prod"
          value={nameDraft}
        />
        <Input
          aria-label="Remote profile host"
          onChange={(event) => setHostDraft(event.target.value)}
          placeholder="prod.example.com"
          value={hostDraft}
        />
      </ClearBox>
      <ClearBox
        style={{
          display: 'grid',
          gap: 'var(--gap-sm)',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 9rem) minmax(0, 1.2fr)',
        }}
      >
        <Input
          aria-label="Remote profile user"
          onChange={(event) => setUserDraft(event.target.value)}
          placeholder="deploy"
          value={userDraft}
        />
        <Input
          aria-label="Remote profile port"
          inputMode="numeric"
          onChange={(event) => setPortDraft(event.target.value)}
          placeholder="22"
          value={portDraft}
        />
        <Input
          aria-label="Remote profile identity file"
          onChange={(event) => setIdentityFileDraft(event.target.value)}
          placeholder="~/.ssh/id_prod"
          value={identityFileDraft}
        />
      </ClearBox>
      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--gap-xs)',
            color: 'var(--color-text-primary, #f5f7ff)',
          }}
        >
          <input
            aria-label="Resume remote shell through tmux"
            checked={launchModeDraft === 'tmux'}
            onChange={(event) => setLaunchModeDraft(event.target.checked ? 'tmux' : 'shell')}
            type="checkbox"
          />
          Resume remote shell through tmux
        </label>
        {launchModeDraft === 'tmux' ? (
          <Input
            aria-label="Remote profile tmux session"
            onChange={(event) => setTmuxSessionDraft(event.target.value)}
            placeholder="prod-main"
            style={{ minWidth: '14rem' }}
            value={tmuxSessionDraft}
          />
        ) : null}
      </ClearBox>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Button
          aria-label={isEditing ? 'Save remote profile changes' : 'Save remote profile'}
          disabled={!canSaveProfile || isSavingProfile || busyProfileID !== null}
          onClick={() => void handleSaveProfile()}
        >
          {isSavingProfile ? 'Saving…' : isEditing ? 'Save changes' : 'Save profile'}
        </Button>
        {isEditing ? (
          <Button disabled={isSavingProfile} onClick={() => resetProfileForm()}>
            Cancel edit
          </Button>
        ) : null}
      </ClearBox>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Input
          aria-label="SSH config path"
          onChange={(event) => setPathDraft(event.target.value)}
          placeholder="Default: ~/.ssh/config"
          style={{ minWidth: '18rem' }}
          value={pathDraft}
        />
        <Button aria-label="Import SSH config" disabled={isImporting} onClick={() => void handleImport()}>
          {isImporting ? 'Importing…' : 'Import SSH config'}
        </Button>
        <Button
          aria-label="Refresh remote profiles"
          disabled={isLoading}
          onClick={() => void loadProfilesAndConnections()}
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </ClearBox>
      <ClearBox
        style={{
          display: 'flex',
          gap: 'var(--gap-sm)',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
        }}
      >
        <Input
          aria-label="Filter remote profiles"
          onChange={(event) => setFilterDraft(event.target.value)}
          placeholder="Filter saved SSH profiles"
          style={{ minWidth: '16rem', flex: '1 1 16rem' }}
          value={filterDraft}
        />
        <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
          <ClearBox style={settingsShellBadgeStyle}>{profiles.length} saved</ClearBox>
          {filterDraft.trim() !== '' ? (
            <ClearBox style={settingsShellBadgeStyle}>{visibleProfiles.length} visible</ClearBox>
          ) : null}
          <ClearBox style={settingsShellBadgeStyle}>{defaultProfilesCount} default</ClearBox>
        </ClearBox>
      </ClearBox>

      {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
      {errorMessage ? (
        <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
      ) : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Loading remote profiles…</Text>
      ) : profiles.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>No saved SSH profiles yet.</Text>
      ) : visibleProfiles.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>No SSH profiles match current filter.</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {visibleProfiles.map((profile) => {
            const connection = connectionsSnapshot.connections.find((item) => item.id === profile.id)
            const isDefault = connectionsSnapshot.active_connection_id === profile.id
            const isBusy = busyProfileID === profile.id
            const connectionStatus = summarizeConnectionStatus(connection)

            return (
              <ClearBox key={profile.id} style={settingsShellListRowStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{profile.name}</Text>
                  <Text style={settingsShellMutedTextStyle}>{describeProfile(profile)}</Text>
                  {profile.identity_file ? (
                    <Text style={settingsShellMutedTextStyle}>{profile.identity_file}</Text>
                  ) : null}
                  {profile.launch_mode === 'tmux' ? (
                    <Text style={settingsShellMutedTextStyle}>
                      tmux resume: {profile.tmux_session || 'derived automatically'}
                    </Text>
                  ) : null}
                  {connectionStatus ? (
                    <Text style={settingsShellMutedTextStyle}>{connectionStatus}</Text>
                  ) : null}
                </ClearBox>
                <ClearBox
                  style={{
                    display: 'flex',
                    gap: 'var(--gap-xs)',
                    alignItems: 'center',
                    flexWrap: 'wrap' as const,
                  }}
                >
                  <ClearBox style={settingsShellBadgeStyle}>SSH</ClearBox>
                  {profile.launch_mode === 'tmux' ? (
                    <ClearBox style={settingsShellBadgeStyle}>tmux</ClearBox>
                  ) : null}
                  {isDefault ? <ClearBox style={settingsShellBadgeStyle}>default</ClearBox> : null}
                  {connection ? (
                    <ClearBox style={settingsShellBadgeStyle}>{connection.usability}</ClearBox>
                  ) : null}
                  {connection ? (
                    <ClearBox style={settingsShellBadgeStyle}>{connection.runtime.check_status}</ClearBox>
                  ) : null}
                  {connection && connection.runtime.launch_status !== 'idle' ? (
                    <ClearBox style={settingsShellBadgeStyle}>
                      launch:{connection.runtime.launch_status}
                    </ClearBox>
                  ) : null}
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleSetDefaultProfile(profile.id)}
                  >
                    Set default
                  </Button>
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleCheckProfile(profile.id)}
                  >
                    Check
                  </Button>
                  {profile.launch_mode === 'tmux' ? (
                    <Button
                      disabled={isBusy || isSavingProfile || tmuxLoadingProfileID === profile.id}
                      onClick={() => void handleBrowseTmuxSessions(profile.id)}
                    >
                      {tmuxLoadingProfileID === profile.id ? 'Loading tmux…' : 'Browse tmux'}
                    </Button>
                  ) : null}
                  <Button disabled={isBusy || isSavingProfile} onClick={() => handleStartEdit(profile)}>
                    Edit
                  </Button>
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleDeleteProfile(profile.id)}
                  >
                    Delete
                  </Button>
                </ClearBox>
                {profile.launch_mode === 'tmux' ? (
                  <ClearBox
                    style={{
                      display: 'grid',
                      gap: 'var(--gap-xs)',
                      width: '100%',
                    }}
                  >
                    {(tmuxSessionsByProfile[profile.id] ?? []).map((session) => (
                      <ClearBox
                        key={session.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--gap-sm)',
                          flexWrap: 'wrap' as const,
                        }}
                      >
                        <Text style={settingsShellMutedTextStyle}>
                          {session.name}
                          {session.attached ? ' · attached' : ' · detached'}
                          {session.window_count ? ` · ${session.window_count} windows` : ''}
                        </Text>
                        <Button
                          disabled={isSavingProfile || busyProfileID !== null}
                          onClick={() => handleUseTmuxSession(profile, session.name)}
                        >
                          Use session
                        </Button>
                      </ClearBox>
                    ))}
                  </ClearBox>
                ) : null}
              </ClearBox>
            )
          })}
        </ClearBox>
      )}
    </ClearBox>
  )
}
