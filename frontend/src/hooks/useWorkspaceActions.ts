import { useCallback } from 'react'

import type { ExecuteToolRequest, ExecuteToolResponse, Widget } from '../types'

type ToolExecutor = (request: ExecuteToolRequest) => Promise<ExecuteToolResponse | null>

export function useWorkspaceActions(executeTool: ToolExecutor) {
  const focusWidget = useCallback(async (widget: Widget) => {
    await executeTool({
      tool_name: 'workspace.focus_widget',
      input: { widget_id: widget.id },
    })
  }, [executeTool])

  const focusTab = useCallback(async (tabId: string) => {
    await executeTool({
      tool_name: 'workspace.focus_tab',
      input: { tab_id: tabId },
    })
  }, [executeTool])

  const createTerminalTab = useCallback(async (title?: string) => {
    await executeTool({
      tool_name: 'workspace.create_terminal_tab',
      input: title ? { title } : {},
    })
  }, [executeTool])

  const renameTab = useCallback(async (tabId: string, title: string) => {
    await executeTool({
      tool_name: 'workspace.rename_tab',
      input: { tab_id: tabId, title },
    })
  }, [executeTool])

  const setTabPinned = useCallback(async (tabId: string, pinned: boolean) => {
    await executeTool({
      tool_name: 'workspace.set_tab_pinned',
      input: { tab_id: tabId, pinned },
    })
  }, [executeTool])

  const moveTab = useCallback(async (tabId: string, beforeTabId: string) => {
    await executeTool({
      tool_name: 'workspace.move_tab',
      input: { tab_id: tabId, before_tab_id: beforeTabId },
    })
  }, [executeTool])

  const closeTab = useCallback(async (tabId: string) => {
    await executeTool({
      tool_name: 'workspace.close_tab',
      input: { tab_id: tabId },
    })
  }, [executeTool])

  const interruptWidget = useCallback(async (widgetId: string) => {
    await executeTool({
      tool_name: 'term.interrupt',
      input: { widget_id: widgetId },
    })
  }, [executeTool])

  return {
    focusWidget,
    focusTab,
    createTerminalTab,
    renameTab,
    setTabPinned,
    moveTab,
    closeTab,
    interruptWidget,
  }
}
