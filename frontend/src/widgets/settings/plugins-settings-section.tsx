import { type ReactNode, useEffect, useMemo, useState } from 'react'

import {
  deleteInstalledPlugin,
  disablePlugin,
  enablePlugin,
  fetchInstalledPlugins,
  installPlugin,
  type InstalledPluginView,
  type PluginCatalogView,
  type PluginInstallSourceKind,
  updateInstalledPlugin,
} from '@/features/plugins/api/client'
import { ClearBox } from '@/shared/ui/components'
import { Button, Input, Select, Text, TextArea } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

function pluginMatchesFilter(plugin: InstalledPluginView, rawFilter: string) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  const fields = [
    plugin.id,
    plugin.display_name,
    plugin.description ?? '',
    plugin.plugin_version,
    plugin.source.kind,
    plugin.source.url,
    plugin.access.owner_username,
    plugin.access.visibility ?? '',
    plugin.enabled ? 'enabled' : 'disabled',
    plugin.runtime_status,
    ...Object.entries(plugin.metadata ?? {}).flatMap(([key, value]) => [key, value]),
    ...plugin.tools.map((tool) => tool.name),
  ]

  return fields.some((field) => field.toLowerCase().includes(filter))
}

function parseMetadataDraft(draft: string) {
  const metadata: Record<string, string> = {}
  const seen = new Set<string>()

  for (const rawLine of draft.split(/\r?\n/g)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      throw new Error('Metadata lines must use `key=value` format.')
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (!key) {
      throw new Error('Metadata keys must be non-empty.')
    }
    if (seen.has(key.toLowerCase())) {
      throw new Error(`Duplicate metadata key: ${key}`)
    }
    seen.add(key.toLowerCase())
    metadata[key] = value
  }

  return metadata
}

function parseAllowedUsersDraft(draft: string) {
  const seen = new Set<string>()
  const users: string[] = []

  for (const entry of draft.split(/[\n,]/g)) {
    const user = entry.trim()
    if (!user || seen.has(user.toLowerCase())) {
      continue
    }
    seen.add(user.toLowerCase())
    users.push(user)
  }

  return users
}

function formatPluginDescription(plugin: InstalledPluginView) {
  const details = [
    plugin.description,
    `${plugin.source.kind} source`,
    plugin.source.ref ? `ref ${plugin.source.ref}` : null,
    `${plugin.tools.length} tool${plugin.tools.length === 1 ? '' : 's'}`,
  ].filter(Boolean)

  return details.join(' · ')
}

function formatPluginStatus(plugin: InstalledPluginView) {
  if (!plugin.enabled) {
    return 'disabled'
  }
  if (plugin.runtime_status === 'validation_error') {
    return 'validation_error'
  }
  return 'ready'
}

export function PluginsSettingsSection() {
  const [catalog, setCatalog] = useState<PluginCatalogView | null>(null)
  const [sourceKind, setSourceKind] = useState<PluginInstallSourceKind>('git')
  const [sourceURL, setSourceURL] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [metadataDraft, setMetadataDraft] = useState('')
  const [visibilityDraft, setVisibilityDraft] = useState('private')
  const [allowedUsersDraft, setAllowedUsersDraft] = useState('')
  const [filterDraft, setFilterDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyPluginID, setBusyPluginID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const plugins = catalog?.plugins ?? []
  const currentActor = catalog?.current_actor
  const visiblePlugins = useMemo(
    () => plugins.filter((plugin) => pluginMatchesFilter(plugin, filterDraft)),
    [filterDraft, plugins],
  )
  const enabledPluginsCount = plugins.filter((plugin) => plugin.enabled).length
  const hasPlugins = plugins.length > 0

  async function loadPlugins(options: { isCancelled?: () => boolean } = {}) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextCatalog = await fetchInstalledPlugins()
      if (!options.isCancelled?.()) {
        setCatalog(nextCatalog)
      }
    } catch (error) {
      if (!options.isCancelled?.()) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load installed plugins')
      }
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    void loadPlugins({
      isCancelled: () => cancelled,
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleInstall() {
    setIsSubmitting(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const metadata = parseMetadataDraft(metadataDraft)
      const allowedUsers = parseAllowedUsersDraft(allowedUsersDraft)
      const result = await installPlugin({
        access: {
          allowed_users: allowedUsers,
          visibility: visibilityDraft.trim() || undefined,
        },
        metadata,
        source: {
          kind: sourceKind,
          ref: sourceKind === 'git' ? sourceRef : undefined,
          url: sourceURL,
        },
      })

      setCatalog(result.plugins)
      setStatusMessage(`Installed ${result.plugin.display_name || result.plugin.id}.`)
      setSourceURL('')
      setSourceRef('')
      setMetadataDraft('')
      setAllowedUsersDraft('')
      setVisibilityDraft('private')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to install plugin')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLifecycleAction(
    plugin: InstalledPluginView,
    action: 'enable' | 'disable' | 'update' | 'delete',
  ) {
    setBusyPluginID(plugin.id)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const result =
        action === 'enable'
          ? await enablePlugin(plugin.id)
          : action === 'disable'
            ? await disablePlugin(plugin.id)
            : action === 'update'
              ? await updateInstalledPlugin(plugin.id)
              : await deleteInstalledPlugin(plugin.id)

      setCatalog(result.plugins)
      if (action === 'delete') {
        setStatusMessage(`Removed ${plugin.display_name || plugin.id}.`)
      } else {
        setStatusMessage(
          action === 'update'
            ? `Updated ${plugin.display_name || plugin.id} to ${result.plugin.plugin_version}.`
            : action === 'disable'
              ? `${plugin.display_name || plugin.id} disabled.`
              : `${result.plugin.display_name || result.plugin.id} enabled.`,
        )
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to change plugin state')
    } finally {
      setBusyPluginID(null)
    }
  }

  return (
    <SectionCard
      description="Локальный plugin catalog на backend-owned runtime path. Install sources намеренно ограничены `git` URL и `zip` archive URL."
      title="Installed plugins"
    >
      <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
        <ClearBox style={settingsShellBadgeStyle}>{plugins.length} installed</ClearBox>
        <ClearBox style={settingsShellBadgeStyle}>{enabledPluginsCount} enabled</ClearBox>
        <ClearBox style={settingsShellBadgeStyle}>{visiblePlugins.length} visible</ClearBox>
        {currentActor?.username ? (
          <ClearBox style={settingsShellBadgeStyle}>actor: {currentActor.username}</ClearBox>
        ) : null}
      </ClearBox>

      <ClearBox style={settingsShellSectionCardStyle}>
        <ClearBox style={settingsShellContentHeaderStyle}>
          <Text style={{ fontWeight: 600 }}>Install plugin bundle</Text>
          <Text style={settingsShellMutedTextStyle}>
            Access policy fields are persisted now for future rights enforcement, but not enforced yet.
          </Text>
        </ClearBox>
        <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)' }}>
          <Select
            aria-label="Plugin source kind"
            onChange={(event) => setSourceKind(event.currentTarget.value === 'zip' ? 'zip' : 'git')}
            value={sourceKind}
          >
            <option value="git">Git repository</option>
            <option value="zip">ZIP archive</option>
          </Select>
          <Input
            aria-label="Plugin source URL"
            onChange={(event) => setSourceURL(event.currentTarget.value)}
            placeholder={
              sourceKind === 'git'
                ? 'https://example.test/rterm-plugin.git'
                : 'file:///tmp/rterm-plugin.zip or https://example.test/rterm-plugin.zip'
            }
            value={sourceURL}
          />
          {sourceKind === 'git' ? (
            <Input
              aria-label="Plugin git ref"
              onChange={(event) => setSourceRef(event.currentTarget.value)}
              placeholder="Optional branch or tag"
              value={sourceRef}
            />
          ) : null}
          <TextArea
            aria-label="Plugin metadata"
            onChange={(event) => setMetadataDraft(event.currentTarget.value)}
            placeholder={'team=ops\nservice=terminal'}
            rows={3}
            value={metadataDraft}
          />
          <Select
            aria-label="Plugin visibility"
            onChange={(event) => setVisibilityDraft(event.currentTarget.value)}
            value={visibilityDraft}
          >
            <option value="private">Private</option>
            <option value="shared">Shared</option>
          </Select>
          <TextArea
            aria-label="Plugin allowed users"
            onChange={(event) => setAllowedUsersDraft(event.currentTarget.value)}
            placeholder={'alice\nbob'}
            rows={2}
            value={allowedUsersDraft}
          />
          <Button
            disabled={isSubmitting || sourceURL.trim().length === 0}
            onClick={() => void handleInstall()}
          >
            {isSubmitting ? 'Installing…' : `Install from ${sourceKind}`}
          </Button>
        </ClearBox>
      </ClearBox>

      <ClearBox style={settingsShellSectionCardStyle}>
        <ClearBox style={settingsShellContentHeaderStyle}>
          <Text style={{ fontWeight: 600 }}>Catalog</Text>
          <Text style={settingsShellMutedTextStyle}>
            Enable, disable, update, or remove installed plugins without reopening the runtime.
          </Text>
        </ClearBox>
        <Input
          aria-label="Filter installed plugins"
          onChange={(event) => setFilterDraft(event.currentTarget.value)}
          placeholder="Filter by plugin, owner, source, tool, or metadata"
          value={filterDraft}
        />
      </ClearBox>

      {statusMessage ? <Text>{statusMessage}</Text> : null}
      {errorMessage ? (
        <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
      ) : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Loading plugin catalog…</Text>
      ) : !hasPlugins ? (
        <Text style={settingsShellMutedTextStyle}>No plugins installed yet.</Text>
      ) : visiblePlugins.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>No installed plugins match current filter.</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {visiblePlugins.map((plugin) => {
            const isBusy = busyPluginID === plugin.id

            return (
              <ClearBox key={plugin.id} style={settingsShellListRowStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{plugin.display_name || plugin.id}</Text>
                  <Text style={settingsShellMutedTextStyle}>{formatPluginDescription(plugin)}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    owner: {plugin.access.owner_username}
                    {plugin.access.visibility ? ` · ${plugin.access.visibility}` : ''}
                    {plugin.metadata && Object.keys(plugin.metadata).length > 0
                      ? ` · meta ${Object.keys(plugin.metadata).length}`
                      : ''}
                  </Text>
                  {plugin.runtime_error ? (
                    <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{plugin.runtime_error}</Text>
                  ) : null}
                </ClearBox>
                <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                  <ClearBox style={settingsShellBadgeStyle}>{plugin.plugin_version}</ClearBox>
                  <ClearBox style={settingsShellBadgeStyle}>{plugin.source.kind}</ClearBox>
                  <ClearBox style={settingsShellBadgeStyle}>{formatPluginStatus(plugin)}</ClearBox>
                  <Button
                    disabled={isBusy}
                    onClick={() => void handleLifecycleAction(plugin, plugin.enabled ? 'disable' : 'enable')}
                  >
                    {plugin.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button disabled={isBusy} onClick={() => void handleLifecycleAction(plugin, 'update')}>
                    Update
                  </Button>
                  <Button disabled={isBusy} onClick={() => void handleLifecycleAction(plugin, 'delete')}>
                    Remove
                  </Button>
                </ClearBox>
              </ClearBox>
            )
          })}
        </ClearBox>
      )}
    </SectionCard>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{title}</Text>
        <Text style={settingsShellMutedTextStyle}>{description}</Text>
      </ClearBox>
      {children}
    </ClearBox>
  )
}
