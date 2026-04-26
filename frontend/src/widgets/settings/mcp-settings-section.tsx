import { useEffect, useMemo, useState } from 'react'

import {
  controlMCPServer,
  deleteMCPServer,
  fetchMCPTemplateCatalog,
  fetchMCPServerDetails,
  fetchMCPServers,
  probeMCPServer,
  type MCPProbeResult,
  registerRemoteMCPServer,
  type MCPServerControlAction,
  type MCPServerTemplate,
  type MCPServerView,
  updateRemoteMCPServer,
} from '@/features/mcp/api/client'
import { ClearBox } from '@/shared/ui/components'
import { Button, Input, Text, TextArea } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

function describeServer(server: MCPServerView) {
  if (server.type === 'remote') {
    return server.endpoint ?? 'Remote endpoint is not exposed by the backend snapshot.'
  }

  return 'Local process server managed by the plugin runtime.'
}

function formatServerState(server: MCPServerView) {
  if (!server.enabled) {
    return 'disabled'
  }
  if (server.active) {
    return server.state
  }

  return server.state
}

function serverMatchesFilter(server: MCPServerView, rawFilter: string) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  const fields = [
    server.id,
    server.type,
    server.state,
    server.endpoint ?? '',
    server.enabled ? 'enabled' : 'disabled',
    server.active ? 'active' : 'inactive',
  ]

  return fields.some((field) => field.toLowerCase().includes(filter))
}

function upsertServer(servers: MCPServerView[], nextServer: MCPServerView) {
  const hasServer = servers.some((server) => server.id === nextServer.id)

  if (!hasServer) {
    return [...servers, nextServer].sort((left, right) => left.id.localeCompare(right.id))
  }

  return servers.map((server) => (server.id === nextServer.id ? nextServer : server))
}

function parseHeadersDraft(draft: string) {
  const headers: Record<string, string> = {}
  const seen = new Set<string>()

  for (const rawLine of draft.split(/\r?\n/g)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) {
      throw new Error('Header lines must use `Name: value` format.')
    }

    const name = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    const canonicalName = name.toLowerCase()

    if (!name) {
      throw new Error('Header names must be non-empty.')
    }
    if (seen.has(canonicalName)) {
      throw new Error(`Duplicate header: ${name}`)
    }

    seen.add(canonicalName)
    headers[name] = value
  }

  return headers
}

function formatHeadersDraft(headers: Record<string, string>) {
  return Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n')
}

const defaultServerID = 'mcp.context7'
const defaultEndpoint = 'https://mcp.context7.com/mcp'
const defaultTemplateID = 'context7'

function findSelectedTemplate(templates: MCPServerTemplate[], templateID: string | null) {
  if (!templateID) {
    return null
  }

  return templates.find((template) => template.id === templateID) ?? null
}

function matchTemplateForServer(templates: MCPServerTemplate[], server: { id: string; endpoint?: string }) {
  const normalizedEndpoint = server.endpoint?.trim()
  const normalizedID = server.id.trim()

  return (
    templates.find((template) => {
      if (template.suggested_server_id && template.suggested_server_id === normalizedID) {
        return true
      }
      return Boolean(template.endpoint && normalizedEndpoint && template.endpoint === normalizedEndpoint)
    }) ?? null
  )
}

function buildDraftHeaders(
  headersDraft: string,
  selectedTemplate: MCPServerTemplate | null,
  authSecretDraft: string,
) {
  const headers = parseHeadersDraft(headersDraft)
  const authKind = selectedTemplate?.auth.kind ?? 'none'
  const authSecret = authSecretDraft.trim()

  if (authKind === 'none' || authSecret === '') {
    return headers
  }

  const headerName = selectedTemplate?.auth.header_name?.trim()
  if (!headerName) {
    return headers
  }

  const duplicateHeader = Object.keys(headers).find(
    (name) => name.trim().toLowerCase() === headerName.toLowerCase(),
  )
  if (duplicateHeader) {
    throw new Error(`${headerName} is already set in raw headers. Clear one of the duplicates.`)
  }

  headers[headerName] = `${selectedTemplate?.auth.value_prefix ?? ''}${authSecret}`
  return headers
}

function describeProbeResult(result: MCPProbeResult) {
  const detail = [
    result.server_name,
    result.server_version ? `v${result.server_version}` : null,
    result.protocol_version ? `protocol ${result.protocol_version}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  if (!detail) {
    return result.message
  }

  return `${result.message} ${detail}`
}

export function MCPSettingsSection() {
  const [servers, setServers] = useState<MCPServerView[]>([])
  const [templates, setTemplates] = useState<MCPServerTemplate[]>([])
  const [idDraft, setIdDraft] = useState(defaultServerID)
  const [endpointDraft, setEndpointDraft] = useState(defaultEndpoint)
  const [headersDraft, setHeadersDraft] = useState('')
  const [selectedTemplateID, setSelectedTemplateID] = useState<string | null>(defaultTemplateID)
  const [authSecretDraft, setAuthSecretDraft] = useState('')
  const [filterDraft, setFilterDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [isProbing, setIsProbing] = useState(false)
  const [busyServerID, setBusyServerID] = useState<string | null>(null)
  const [editingServerID, setEditingServerID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<MCPProbeResult | null>(null)
  const hasServers = servers.length > 0
  const isEditing = editingServerID !== null
  const canSubmit = idDraft.trim().length > 0 && endpointDraft.trim().length > 0
  const visibleServers = useMemo(
    () => servers.filter((server) => serverMatchesFilter(server, filterDraft)),
    [filterDraft, servers],
  )
  const activeServersCount = servers.filter((server) => server.active).length
  const disabledServersCount = servers.filter((server) => !server.enabled).length
  const selectedTemplate = useMemo(
    () => findSelectedTemplate(templates, selectedTemplateID),
    [selectedTemplateID, templates],
  )

  function resetForm() {
    setEditingServerID(null)
    setIdDraft(defaultServerID)
    setEndpointDraft(defaultEndpoint)
    setHeadersDraft('')
    setAuthSecretDraft('')
    setSelectedTemplateID(defaultTemplateID)
    setProbeResult(null)
  }

  async function loadServers(options: { isCancelled?: () => boolean } = {}) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextServers = await fetchMCPServers()
      if (!options.isCancelled?.()) {
        setServers(nextServers)
      }
    } catch (error) {
      if (!options.isCancelled?.()) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load MCP servers')
      }
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoading(false)
      }
    }
  }

  async function loadTemplates(options: { isCancelled?: () => boolean } = {}) {
    setIsLoadingTemplates(true)

    try {
      const nextTemplates = await fetchMCPTemplateCatalog()
      if (!options.isCancelled?.()) {
        setTemplates(nextTemplates)
        if (nextTemplates.length > 0 && !findSelectedTemplate(nextTemplates, selectedTemplateID)) {
          setSelectedTemplateID(nextTemplates[0]?.id ?? null)
        }
      }
    } catch (error) {
      if (!options.isCancelled?.()) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load MCP templates')
      }
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoadingTemplates(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    void loadServers({ isCancelled: () => cancelled })
    void loadTemplates({ isCancelled: () => cancelled })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit() {
    setIsSubmittingForm(true)
    setErrorMessage(null)
    setStatusMessage(null)
    setProbeResult(null)

    try {
      const headers = buildDraftHeaders(headersDraft, selectedTemplate, authSecretDraft)
      const server = isEditing
        ? await updateRemoteMCPServer(editingServerID, {
            endpoint: endpointDraft,
            headers,
            id: idDraft,
          })
        : await registerRemoteMCPServer({
            endpoint: endpointDraft,
            headers,
            id: idDraft,
          })
      setServers((currentServers) => upsertServer(currentServers, server))
      setStatusMessage(
        isEditing ? `Saved ${server.id}.` : `Registered ${server.id}. Start it explicitly before invoke.`,
      )
      resetForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save MCP server')
    } finally {
      setIsSubmittingForm(false)
    }
  }

  async function handleProbe() {
    setIsProbing(true)
    setErrorMessage(null)
    setStatusMessage(null)
    setProbeResult(null)

    try {
      const headers = buildDraftHeaders(headersDraft, selectedTemplate, authSecretDraft)
      const result = await probeMCPServer({
        endpoint: endpointDraft,
        headers,
        id: idDraft,
      })
      setProbeResult(result)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to probe MCP endpoint')
    } finally {
      setIsProbing(false)
    }
  }

  async function handleControl(serverID: string, action: MCPServerControlAction) {
    setBusyServerID(serverID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const server = await controlMCPServer(serverID, action)
      setServers((currentServers) => upsertServer(currentServers, server))
      setStatusMessage(`${server.id}: ${action} complete.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Unable to ${action} MCP server`)
    } finally {
      setBusyServerID(null)
    }
  }

  async function handleStartEdit(serverID: string) {
    setBusyServerID(serverID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const server = await fetchMCPServerDetails(serverID)
      setEditingServerID(server.id)
      setIdDraft(server.id)
      setEndpointDraft(server.endpoint ?? '')
      setHeadersDraft(formatHeadersDraft(server.headers))
      setAuthSecretDraft('')
      setProbeResult(null)
      setSelectedTemplateID(matchTemplateForServer(templates, server)?.id ?? null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load MCP server details')
    } finally {
      setBusyServerID(null)
    }
  }

  async function handleDelete(serverID: string) {
    setBusyServerID(serverID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const deletedServerID = await deleteMCPServer(serverID)
      setServers((currentServers) => currentServers.filter((server) => server.id !== deletedServerID))
      if (editingServerID === deletedServerID) {
        resetForm()
      }
      setStatusMessage(`Deleted ${deletedServerID}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete MCP server')
    } finally {
      setBusyServerID(null)
    }
  }

  function handleApplyTemplate(template: MCPServerTemplate) {
    setEditingServerID(null)
    setSelectedTemplateID(template.id)
    setIdDraft(template.suggested_server_id ?? defaultServerID)
    setEndpointDraft(template.endpoint ?? '')
    setHeadersDraft('')
    setAuthSecretDraft('')
    setProbeResult(null)
    setStatusMessage(`Loaded ${template.display_name} template.`)
    setErrorMessage(null)
  }

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>MCP servers</Text>
        <Text style={settingsShellMutedTextStyle}>
          External MCP onboarding is explicit: register or edit a remote endpoint, then start/stop/enable it
          manually. Invoke and AI handoff remain separate operator actions outside this settings slice.
        </Text>
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-xs)' }}>
        <Text style={{ fontWeight: 600 }}>Onboarding templates</Text>
        <Text style={settingsShellMutedTextStyle}>
          Load a bounded template to prefill endpoint and auth helpers. Registration still stays explicit.
        </Text>
        {isLoadingTemplates ? (
          <Text style={settingsShellMutedTextStyle}>Loading MCP templates…</Text>
        ) : (
          <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
            {templates.map((template) => (
              <Button
                key={template.id}
                disabled={isSubmittingForm || isProbing || busyServerID !== null}
                onClick={() => handleApplyTemplate(template)}
              >
                {template.display_name}
              </Button>
            ))}
          </ClearBox>
        )}
        {selectedTemplate ? (
          <Text style={settingsShellMutedTextStyle}>{selectedTemplate.description}</Text>
        ) : null}
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)', gridTemplateColumns: '1fr 1.4fr' }}>
        <Input
          aria-label="MCP server id"
          disabled={isEditing}
          onChange={(event) => setIdDraft(event.target.value)}
          placeholder="mcp.context7"
          value={idDraft}
        />
        <Input
          aria-label="MCP endpoint URL"
          onChange={(event) => setEndpointDraft(event.target.value)}
          placeholder="https://mcp.context7.com/mcp"
          value={endpointDraft}
        />
      </ClearBox>
      {selectedTemplate && selectedTemplate.auth.kind !== 'none' ? (
        <Input
          aria-label={selectedTemplate.auth.secret_label ?? 'MCP template secret'}
          onChange={(event) => setAuthSecretDraft(event.target.value)}
          placeholder={selectedTemplate.auth.secret_placeholder ?? 'Optional auth secret'}
          value={authSecretDraft}
        />
      ) : null}
      <TextArea
        aria-label="MCP request headers"
        onChange={(event) => setHeadersDraft(event.target.value)}
        placeholder="Optional headers, one per line: Authorization: Bearer ..."
        style={{ minHeight: '5.6rem' }}
        value={headersDraft}
      />
      <Text style={settingsShellMutedTextStyle}>
        Raw headers are persisted in the local runtime MCP registry. Template auth helpers are merged at
        request time before probe/register.
      </Text>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Button
          aria-label={isEditing ? 'Save MCP server changes' : 'Register remote MCP server'}
          disabled={!canSubmit || isSubmittingForm || busyServerID !== null}
          onClick={() => void handleSubmit()}
        >
          {isSubmittingForm
            ? isEditing
              ? 'Saving…'
              : 'Registering…'
            : isEditing
              ? 'Save changes'
              : 'Register remote MCP'}
        </Button>
        <Button
          aria-label="Test MCP endpoint"
          disabled={!canSubmit || isSubmittingForm || isProbing || busyServerID !== null}
          onClick={() => void handleProbe()}
        >
          {isProbing ? 'Testing…' : 'Test endpoint'}
        </Button>
        {isEditing ? (
          <Button disabled={isSubmittingForm} onClick={() => resetForm()}>
            Cancel edit
          </Button>
        ) : null}
        <Button aria-label="Refresh MCP servers" disabled={isLoading} onClick={() => void loadServers()}>
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
          aria-label="Filter MCP servers"
          onChange={(event) => setFilterDraft(event.target.value)}
          placeholder="Filter registered MCP servers"
          style={{ minWidth: '16rem', flex: '1 1 16rem' }}
          value={filterDraft}
        />
        <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
          <ClearBox style={settingsShellBadgeStyle}>{servers.length} registered</ClearBox>
          {filterDraft.trim() !== '' ? (
            <ClearBox style={settingsShellBadgeStyle}>{visibleServers.length} visible</ClearBox>
          ) : null}
          <ClearBox style={settingsShellBadgeStyle}>{activeServersCount} active</ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>{disabledServersCount} disabled</ClearBox>
        </ClearBox>
      </ClearBox>

      {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
      {probeResult ? (
        <Text style={settingsShellMutedTextStyle}>
          Probe `{probeResult.status}`: {describeProbeResult(probeResult)}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
      ) : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Loading MCP servers…</Text>
      ) : !hasServers ? (
        <Text style={settingsShellMutedTextStyle}>No MCP servers registered yet.</Text>
      ) : visibleServers.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>No MCP servers match current filter.</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {visibleServers.map((server) => {
            const isBusy = busyServerID === server.id

            return (
              <ClearBox key={server.id} style={settingsShellListRowStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{server.id}</Text>
                  <Text style={settingsShellMutedTextStyle}>{describeServer(server)}</Text>
                  <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                    <ClearBox style={settingsShellBadgeStyle}>{server.type}</ClearBox>
                    <ClearBox style={settingsShellBadgeStyle}>{formatServerState(server)}</ClearBox>
                    {server.active ? <ClearBox style={settingsShellBadgeStyle}>active</ClearBox> : null}
                  </ClearBox>
                </ClearBox>
                <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                  {server.type === 'remote' ? (
                    <Button
                      disabled={isBusy || isSubmittingForm}
                      onClick={() => void handleStartEdit(server.id)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {server.type === 'remote' ? (
                    <Button
                      disabled={isBusy || isSubmittingForm}
                      onClick={() => void handleDelete(server.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'start')}
                  >
                    Start
                  </Button>
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'stop')}
                  >
                    Stop
                  </Button>
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'restart')}
                  >
                    Restart
                  </Button>
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'disable')}
                  >
                    Disable
                  </Button>
                  <Button
                    disabled={isBusy || server.enabled}
                    onClick={() => void handleControl(server.id, 'enable')}
                  >
                    Enable
                  </Button>
                </ClearBox>
              </ClearBox>
            )
          })}
        </ClearBox>
      )}
    </ClearBox>
  )
}
