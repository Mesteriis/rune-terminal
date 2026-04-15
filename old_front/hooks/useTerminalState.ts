import { useCallback, useEffect, useMemo, useState } from 'react'

import { RtermClient } from '../lib/api'
import type { TerminalState, Workspace, WorkspaceContextSummary } from '../types'

type UseTerminalStateParams = {
  client: RtermClient | null
  workspace: Workspace | null
  repoRoot: string
  widgetContextEnabled: boolean
}

export function useTerminalState({ client, workspace, repoRoot, widgetContextEnabled }: UseTerminalStateParams) {
  const [terminalState, setTerminalState] = useState<TerminalState | null>(null)

  const workspaceContext = useMemo<WorkspaceContextSummary | null>(() => {
    if (!workspace) {
      return null
    }
    return {
      workspace_id: workspace.id,
      repo_root: repoRoot,
      active_widget_id: widgetContextEnabled ? workspace.active_widget_id : undefined,
      widget_context_enabled: widgetContextEnabled,
    }
  }, [repoRoot, widgetContextEnabled, workspace])

  const refreshTerminalState = useCallback(
    async (widgetId = workspace?.active_widget_id) => {
      if (!client || !workspace || !widgetId) {
        return null
      }

      const response = await client.executeTool({
        tool_name: 'term.get_state',
        input: { widget_id: widgetId },
        context: toExecutionContext(workspaceContext),
      })
      if (response.status === 'ok') {
        setTerminalState(response.output as TerminalState)
      }
      return response
    },
    [client, workspace, workspaceContext],
  )

  useEffect(() => {
    if (!client || !workspace) {
      setTerminalState(null)
      return
    }
    void refreshTerminalState(workspace.active_widget_id)
  }, [client, workspace, refreshTerminalState])

  return {
    terminalState,
    workspaceContext,
    refreshTerminalState,
  }
}

function toExecutionContext(context: WorkspaceContextSummary | null) {
  if (!context) {
    return undefined
  }
  return {
    workspace_id: context.workspace_id,
    repo_root: context.repo_root,
    active_widget_id: context.active_widget_id,
  }
}
