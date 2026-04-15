import { useCallback } from 'react'

import { RtermClient } from '../lib/api'
import type { ConnectionCatalog, RuntimeNotice, Widget, Workspace } from '../types'

type RefreshTerminalState = (widgetId?: string) => Promise<unknown>

type WorkspaceActionsOptions = {
  client: RtermClient | null
  setWorkspace: (workspace: Workspace) => void
  setConnections?: (connections: ConnectionCatalog) => void
  refreshTerminalState: RefreshTerminalState
  setNotice: (notice: RuntimeNotice | null) => void
}

export function useWorkspaceActions({
  client,
  setWorkspace,
  setConnections,
  refreshTerminalState,
  setNotice,
}: WorkspaceActionsOptions) {
  const focusWidget = useCallback(async (widget: Widget) => {
    if (!client) {
      return
    }
    try {
      const response = await client.focusWidget(widget.id)
      setWorkspace(response.workspace)
      await refreshTerminalState(response.workspace.active_widget_id)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to focus widget',
        detail: formatError(error),
      })
    }
  }, [client, refreshTerminalState, setNotice, setWorkspace])

  const focusTab = useCallback(async (tabId: string) => {
    if (!client) {
      return
    }
    try {
      const response = await client.focusTab(tabId)
      setWorkspace(response.workspace)
      await refreshTerminalState(response.workspace.active_widget_id)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to focus tab',
        detail: formatError(error),
      })
    }
  }, [client, refreshTerminalState, setNotice, setWorkspace])

  const createTerminalTab = useCallback(async (title?: string, connectionId?: string) => {
    if (!client) {
      return
    }
    try {
      const response = connectionId
        ? await client.createTerminalTabWithConnection(connectionId, title)
        : await client.createTerminalTab(title)
      setWorkspace(response.workspace)
      if (setConnections) {
        const nextConnections = await client.connections()
        setConnections(nextConnections)
      }
      await refreshTerminalState(response.widget_id)
    } catch (error) {
      if (connectionId && setConnections) {
        try {
          const nextConnections = await client.connections()
          setConnections(nextConnections)
        } catch {
          // Ignore secondary refresh failures. The primary launch error is more important.
        }
      }
      setNotice({
        tone: 'error',
        title: connectionId ? 'Failed to open remote shell' : 'Failed to create tab',
        detail: connectionId ? formatRemoteLaunchError(error) : formatError(error),
      })
    }
  }, [client, refreshTerminalState, setConnections, setNotice, setWorkspace])

  const createTerminalTabWithConnection = useCallback(async (connectionId: string, title?: string) => {
    await createTerminalTab(title, connectionId)
  }, [createTerminalTab])

  const renameTab = useCallback(async (tabId: string, title: string) => {
    if (!client) {
      return
    }
    try {
      const response = await client.renameTab(tabId, title)
      setWorkspace(response.workspace)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to rename tab',
        detail: formatError(error),
      })
    }
  }, [client, setNotice, setWorkspace])

  const setTabPinned = useCallback(async (tabId: string, pinned: boolean) => {
    if (!client) {
      return
    }
    try {
      const response = await client.setTabPinned(tabId, pinned)
      setWorkspace(response.workspace)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to update tab pin',
        detail: formatError(error),
      })
    }
  }, [client, setNotice, setWorkspace])

  const moveTab = useCallback(async (tabId: string, beforeTabId: string) => {
    if (!client) {
      return
    }
    try {
      const response = await client.moveTab(tabId, beforeTabId)
      setWorkspace(response.workspace)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to move tab',
        detail: formatError(error),
      })
    }
  }, [client, setNotice, setWorkspace])

  const closeTab = useCallback(async (tabId: string) => {
    if (!client) {
      return
    }
    try {
      const response = await client.closeTab(tabId)
      setWorkspace(response.workspace)
      await refreshTerminalState(response.workspace.active_widget_id)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to close tab',
        detail: formatError(error),
      })
    }
  }, [client, refreshTerminalState, setNotice, setWorkspace])

  return {
    focusWidget,
    focusTab,
    createTerminalTab,
    createTerminalTabWithConnection,
    renameTab,
    setTabPinned,
    moveTab,
    closeTab,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatRemoteLaunchError(error: unknown) {
  const detail = formatError(error)
  const normalized = detail.toLowerCase()

  if (normalized.includes('permission denied')) {
    return [
      'SSH authentication failed (permission denied).',
      'Verify user, identity file, and host access.',
      `Raw error: ${detail}`,
    ].join('\n')
  }
  if (normalized.includes('connection refused')) {
    return [
      'SSH connection was refused by the target host.',
      'Verify host, port, and SSH daemon availability.',
      `Raw error: ${detail}`,
    ].join('\n')
  }
  if (normalized.includes('could not resolve hostname') || normalized.includes('name resolution')) {
    return [
      'SSH host name could not be resolved.',
      'Verify DNS/host value in the saved connection profile.',
      `Raw error: ${detail}`,
    ].join('\n')
  }
  if (normalized.includes('operation timed out') || normalized.includes('connection timed out')) {
    return [
      'SSH connection timed out before a usable shell started.',
      'Verify network reachability and firewall rules.',
      `Raw error: ${detail}`,
    ].join('\n')
  }
  if (normalized.includes('identity file')) {
    return [
      'SSH identity file is not usable.',
      'Check the identity-file path in Connections and run "Check" again.',
      `Raw error: ${detail}`,
    ].join('\n')
  }

  return [
    'Remote shell failed to launch.',
    'Use Connections → Check to inspect profile/preflight state, then retry.',
    `Raw error: ${detail}`,
  ].join('\n')
}
