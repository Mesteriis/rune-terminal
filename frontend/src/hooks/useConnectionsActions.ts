import { useCallback } from 'react'

import { RtermClient } from '../lib/api'
import type { ConnectionCatalog, RuntimeNotice } from '../types'

type UseConnectionsActionsOptions = {
  client: RtermClient | null
  setConnections: (connections: ConnectionCatalog) => void
  setNotice: (notice: RuntimeNotice | null) => void
}

export function useConnectionsActions({ client, setConnections, setNotice }: UseConnectionsActionsOptions) {
  const checkConnection = useCallback(async (connectionId: string) => {
    if (!client) {
      return
    }
    try {
      const result = await client.checkConnection(connectionId)
      setConnections(result.connections)
      const connection = result.connections.connections.find((candidate) => candidate.id === connectionId)
      setNotice({
        tone: connection?.usability === 'attention' ? 'error' : 'success',
        title: connection?.usability === 'attention' ? 'Connection needs attention' : 'Connection check passed',
        detail: connection?.runtime.check_error || connection?.name || connectionId,
      })
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to check connection',
        detail: formatError(error),
      })
    }
  }, [client, setConnections, setNotice])

  const selectConnection = useCallback(async (connectionId: string) => {
    if (!client) {
      return
    }
    try {
      const snapshot = await client.selectActiveConnection(connectionId)
      setConnections(snapshot)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to select connection',
        detail: formatError(error),
      })
    }
  }, [client, setConnections, setNotice])

  const saveSSHConnection = useCallback(async (input: {
    name?: string
    host: string
    user?: string
    port?: number
    identity_file?: string
  }) => {
    if (!client) {
      return
    }
    try {
      const result = await client.saveSSHConnection(input)
      setConnections(result.connections)
      setNotice({
        tone: 'success',
        title: 'SSH connection saved',
        detail: input.name || input.host,
      })
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to save SSH connection',
        detail: formatError(error),
      })
    }
  }, [client, setConnections, setNotice])

  return {
    checkConnection,
    selectConnection,
    saveSSHConnection,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
