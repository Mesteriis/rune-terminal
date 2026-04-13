import { useCallback } from 'react'

import { RtermClient } from '../lib/api'
import type { RuntimeNotice, Widget, Workspace } from '../types'

type RefreshTerminalState = (widgetId?: string) => Promise<unknown>

type WorkspaceActionsOptions = {
  client: RtermClient | null
  setWorkspace: (workspace: Workspace) => void
  refreshTerminalState: RefreshTerminalState
  setNotice: (notice: RuntimeNotice | null) => void
}

export function useWorkspaceActions({
  client,
  setWorkspace,
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
      await refreshTerminalState(response.widget_id)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to create tab',
        detail: formatError(error),
      })
    }
  }, [client, refreshTerminalState, setNotice, setWorkspace])

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

  const interruptWidget = useCallback(async (widgetId: string) => {
    if (!client) {
      return
    }
    try {
      await client.executeTool({
        tool_name: 'term.interrupt',
        input: { widget_id: widgetId },
      })
      await refreshTerminalState(widgetId)
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Failed to interrupt terminal',
        detail: formatError(error),
      })
    }
  }, [client, refreshTerminalState, setNotice])

  return {
    focusWidget,
    focusTab,
    createTerminalTab,
    createTerminalTabWithConnection,
    renameTab,
    setTabPinned,
    moveTab,
    closeTab,
    interruptWidget,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
