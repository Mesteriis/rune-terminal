import { useEffect, useState } from 'react'

import {
  deleteRemoteProfile,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  saveRemoteProfile,
  type RemoteProfile,
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

const defaultProfileDraft = {
  host: '',
  identityFile: '',
  name: '',
  port: '',
  user: '',
}

export function RemoteProfilesSettingsSection() {
  const [profiles, setProfiles] = useState<RemoteProfile[]>([])
  const [nameDraft, setNameDraft] = useState(defaultProfileDraft.name)
  const [hostDraft, setHostDraft] = useState(defaultProfileDraft.host)
  const [userDraft, setUserDraft] = useState(defaultProfileDraft.user)
  const [portDraft, setPortDraft] = useState(defaultProfileDraft.port)
  const [identityFileDraft, setIdentityFileDraft] = useState(defaultProfileDraft.identityFile)
  const [pathDraft, setPathDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [busyProfileID, setBusyProfileID] = useState<string | null>(null)
  const [editingProfileID, setEditingProfileID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isEditing = editingProfileID !== null
  const canSaveProfile = hostDraft.trim() !== ''

  function resetProfileForm() {
    setEditingProfileID(null)
    setNameDraft(defaultProfileDraft.name)
    setHostDraft(defaultProfileDraft.host)
    setUserDraft(defaultProfileDraft.user)
    setPortDraft(defaultProfileDraft.port)
    setIdentityFileDraft(defaultProfileDraft.identityFile)
  }

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setErrorMessage(null)

    fetchRemoteProfiles()
      .then((nextProfiles) => {
        if (cancelled) {
          return
        }

        setProfiles(nextProfiles)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to load remote profiles')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

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
        name: nameDraft,
        port: normalizedPort === '' ? undefined : Number(normalizedPort),
        user: userDraft,
      })
      setProfiles(result.profiles)
      setStatusMessage(isEditing ? `Saved ${result.profile.name}.` : `Saved ${result.profile.name}.`)
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

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Remote profiles</Text>
        <Text style={settingsShellMutedTextStyle}>
          Saved SSH targets are backend-owned. You can keep a narrow saved profile inventory here and
          separately import direct host/user/port/identity entries from `~/.ssh/config`.
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
      </ClearBox>

      {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
      {errorMessage ? (
        <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
      ) : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Loading remote profiles…</Text>
      ) : profiles.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>No saved SSH profiles yet.</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {profiles.map((profile) => (
            <ClearBox key={profile.id} style={settingsShellListRowStyle}>
              <ClearBox style={settingsShellContentHeaderStyle}>
                <Text style={{ fontWeight: 600 }}>{profile.name}</Text>
                <Text style={settingsShellMutedTextStyle}>{describeProfile(profile)}</Text>
                {profile.identity_file ? (
                  <Text style={settingsShellMutedTextStyle}>{profile.identity_file}</Text>
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
                <Button
                  disabled={busyProfileID === profile.id || isSavingProfile}
                  onClick={() => handleStartEdit(profile)}
                >
                  Edit
                </Button>
                <Button
                  disabled={busyProfileID === profile.id || isSavingProfile}
                  onClick={() => void handleDeleteProfile(profile.id)}
                >
                  Delete
                </Button>
              </ClearBox>
            </ClearBox>
          ))}
        </ClearBox>
      )}
    </ClearBox>
  )
}
