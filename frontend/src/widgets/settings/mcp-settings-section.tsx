import { useEffect, useState } from 'react'

import {
  controlMCPServer,
  fetchMCPServers,
  registerRemoteMCPServer,
  type MCPServerControlAction,
  type MCPServerView,
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

export function MCPSettingsSection() {
  const [servers, setServers] = useState<MCPServerView[]>([])
  const [idDraft, setIdDraft] = useState('mcp.context7')
  const [endpointDraft, setEndpointDraft] = useState('https://mcp.context7.com/mcp')
  const [headersDraft, setHeadersDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [busyServerID, setBusyServerID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasServers = servers.length > 0
  const canRegister = idDraft.trim().length > 0 && endpointDraft.trim().length > 0

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

  useEffect(() => {
    let cancelled = false

    void loadServers({ isCancelled: () => cancelled })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRegister() {
    setIsRegistering(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const headers = parseHeadersDraft(headersDraft)
      const server = await registerRemoteMCPServer({
        endpoint: endpointDraft,
        headers,
        id: idDraft,
      })
      setServers((currentServers) => upsertServer(currentServers, server))
      setStatusMessage(`Registered ${server.id}. Start it explicitly before invoke.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to register MCP server')
    } finally {
      setIsRegistering(false)
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

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>MCP servers</Text>
        <Text style={settingsShellMutedTextStyle}>
          External MCP onboarding is explicit: register a remote endpoint, then start/stop/enable it manually.
          Invoke and AI handoff remain separate operator actions outside this settings slice.
        </Text>
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)', gridTemplateColumns: '1fr 1.4fr' }}>
        <Input
          aria-label="MCP server id"
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
      <TextArea
        aria-label="MCP request headers"
        onChange={(event) => setHeadersDraft(event.target.value)}
        placeholder="Optional headers, one per line: Authorization: Bearer ..."
        style={{ minHeight: '5.6rem' }}
        value={headersDraft}
      />
      <Text style={settingsShellMutedTextStyle}>
        Header values are persisted in the local runtime MCP registry. Do not put broad-scope secrets here.
      </Text>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Button
          aria-label="Register remote MCP server"
          disabled={!canRegister || isRegistering}
          onClick={() => void handleRegister()}
        >
          {isRegistering ? 'Registering…' : 'Register remote MCP'}
        </Button>
        <Button aria-label="Refresh MCP servers" disabled={isLoading} onClick={() => void loadServers()}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </ClearBox>

      {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
      {errorMessage ? (
        <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
      ) : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>Loading MCP servers…</Text>
      ) : !hasServers ? (
        <Text style={settingsShellMutedTextStyle}>No MCP servers registered yet.</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {servers.map((server) => {
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
