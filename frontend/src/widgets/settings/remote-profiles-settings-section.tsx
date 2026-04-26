import { useEffect, useState } from 'react'

import {
  fetchRemoteProfiles,
  importSSHConfigProfiles,
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

export function RemoteProfilesSettingsSection() {
  const [profiles, setProfiles] = useState<RemoteProfile[]>([])
  const [pathDraft, setPathDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>Remote profiles</Text>
        <Text style={settingsShellMutedTextStyle}>
          Saved SSH targets are backend-owned. Import is one-way and intentionally supports only direct
          host/user/port/identity fields.
        </Text>
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
              <ClearBox style={settingsShellBadgeStyle}>SSH</ClearBox>
            </ClearBox>
          ))}
        </ClearBox>
      )}
    </ClearBox>
  )
}
