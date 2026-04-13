import { useCallback, useEffect, useMemo, useState } from 'react'

import { summarizeOutput } from '../lib/agentFeed'
import { useAgentActions } from './useAgentActions'
import { useApprovalFlow } from './useApprovalFlow'
import { useConnectionsActions } from './useConnectionsActions'
import { useRuntimeBootstrap } from './useRuntimeBootstrap'
import { useAgentFeed } from './useAgentFeed'
import { usePolicyLists } from './usePolicyLists'
import { usePolicyActions } from './usePolicyActions'
import { useTerminalState } from './useTerminalState'
import { useWorkspaceActions } from './useWorkspaceActions'
import type {
  ExecuteToolRequest,
  ExecuteToolResponse,
  RuntimeNotice,
} from '../types'

const QUIET_TOOLS = new Set([
  'workspace.list_tabs',
  'workspace.get_active_tab',
  'workspace.focus_tab',
  'workspace.move_tab',
  'workspace.rename_tab',
  'workspace.set_tab_pinned',
  'workspace.create_terminal_tab',
  'workspace.close_tab',
  'workspace.list_widgets',
  'workspace.get_active_widget',
  'workspace.focus_widget',
  'term.get_state',
])

export function useRuntimeShell() {
  const [widgetContextEnabled, setWidgetContextEnabled] = useState(() => readWidgetContextPreference())
  const bootstrap = useRuntimeBootstrap()
  const [lastResponse, setLastResponse] = useState<ExecuteToolResponse | null>(null)
  const [notice, setNotice] = useState<RuntimeNotice | null>(null)
  const { agentFeed, appendAgentFeed } = useAgentFeed()

  const { terminalState, workspaceContext, refreshTerminalState } = useTerminalState({
    client: bootstrap.client,
    workspace: bootstrap.workspace,
    repoRoot: bootstrap.repoRoot,
    widgetContextEnabled,
  })

  const activeWidget = useMemo(() => {
    const workspace = bootstrap.workspace
    if (!workspace) {
      return null
    }
    return workspace.widgets.find((widget) => widget.id === workspace.active_widget_id) ?? null
  }, [bootstrap.workspace])

  const activeTab = useMemo(() => {
    const workspace = bootstrap.workspace
    if (!workspace) {
      return null
    }
    return workspace.tabs.find((tab) => tab.id === workspace.active_tab_id) ?? null
  }, [bootstrap.workspace])

  const activeConnection = useMemo(() => {
    const connections = bootstrap.connections
    if (!connections) {
      return null
    }
    return (
      connections.connections.find((connection) => connection.id === connections.active_connection_id) ??
      connections.connections.find((connection) => connection.active) ??
      null
    )
  }, [bootstrap.connections])

  useEffect(() => {
    writeWidgetContextPreference(widgetContextEnabled)
  }, [widgetContextEnabled])

  const executionContext = useCallback((nextWorkspace = bootstrap.workspace) => {
    if (!nextWorkspace) {
      return undefined
    }
    return {
      workspace_id: nextWorkspace.id,
      repo_root: bootstrap.repoRoot,
      active_widget_id: widgetContextEnabled ? nextWorkspace.active_widget_id : undefined,
    }
  }, [bootstrap.repoRoot, bootstrap.workspace, widgetContextEnabled])

  const { trustedRules, ignoreRules, refreshPolicyLists } = usePolicyLists({
    client: bootstrap.client,
  })

  async function refreshWorkspace() {
    if (!bootstrap.client) {
      return
    }
    const nextWorkspace = await bootstrap.client.workspace()
    bootstrap.setWorkspace(nextWorkspace)
  }

  async function refreshConnections() {
    if (!bootstrap.client) {
      return
    }
    const nextConnections = await bootstrap.client.connections()
    bootstrap.setConnections(nextConnections)
  }

  async function refreshAudit() {
    if (!bootstrap.client) {
      return
    }
    const audit = await bootstrap.client.audit()
    bootstrap.setAuditEvents(audit.events ?? [])
  }

  const approvalFlow = useApprovalFlow({
    client: bootstrap.client,
    workspace: bootstrap.workspace,
    executionContext,
    executeTool: async (request) => executeTool(request),
    refreshAudit,
    appendAgentFeed,
    setLastResponse,
    setNotice,
  })

  async function executeTool(request: ExecuteToolRequest) {
    if (!bootstrap.client || !bootstrap.workspace) {
      return null
    }

    try {
      const response = await bootstrap.client.executeTool({
        ...request,
        context: executionContext(bootstrap.workspace),
      })
      setLastResponse(response)
      await refreshAudit()

      if (approvalFlow.registerPendingApproval(request, response)) {
        return response
      }

      approvalFlow.clearPendingApproval()

      if (response.status === 'ok') {
        await Promise.all([refreshWorkspace(), refreshPolicyLists(), refreshConnections()])
        if (request.tool_name.startsWith('term.') || request.tool_name.startsWith('workspace.')) {
          const targetWidgetID = resolveTerminalTargetWidgetID(request, response, bootstrap.workspace.active_widget_id)
          const terminalResponse = await refreshTerminalState(targetWidgetID)
          if (terminalResponse) {
            setLastResponse(terminalResponse)
          }
        }
        if (!QUIET_TOOLS.has(request.tool_name)) {
          setNotice({
            tone: 'success',
            title: `${request.tool_name} completed`,
            detail: response.operation?.summary ?? summarizeOutput(response.output),
          })
        }
        return response
      }

      setNotice({
        tone: 'error',
        title: `${request.tool_name} failed`,
        detail: response.error ?? response.error_code ?? 'Execution failed.',
      })
      return response
    } catch (error) {
      setNotice({
        tone: 'error',
        title: `${request.tool_name} request failed`,
        detail: formatError(error),
      })
      return null
    }
  }
  const workspaceActions = useWorkspaceActions({
    client: bootstrap.client,
    setWorkspace: bootstrap.setWorkspace,
    refreshTerminalState,
    setNotice,
  })
  const connectionActions = useConnectionsActions({
    client: bootstrap.client,
    setConnections: bootstrap.setConnections,
    setNotice,
  })
  const agentActions = useAgentActions({
    client: bootstrap.client,
    workspace: bootstrap.workspace,
    executeTool,
    appendAgentFeed,
    refreshAudit,
    setAgentCatalog: bootstrap.setAgentCatalog,
    setNotice,
  })
  const policyActions = usePolicyActions({
    executeTool,
  })

  return {
    client: bootstrap.client,
    workspace: bootstrap.workspace,
    workspaceContext,
    repoRoot: bootstrap.repoRoot,
    connections: bootstrap.connections,
    tools: bootstrap.tools,
    terminalState,
    trustedRules,
    ignoreRules,
    auditEvents: bootstrap.auditEvents,
    lastResponse,
    runtimeError: bootstrap.runtimeError,
    notice,
    pendingApproval: approvalFlow.pendingApproval,
    agentFeed,
    isConfirmingApproval: approvalFlow.isConfirmingApproval,
    agentCatalog: bootstrap.agentCatalog,
    activeWidget,
    activeTab,
    activeConnection,
    widgetContextEnabled,
    clearNotice: () => setNotice(null),
    executeTool,
    runAgentAction: agentActions.runAgentAction,
    submitAgentPrompt: agentActions.submitAgentPrompt,
    reportAgentAttachmentUnavailable: agentActions.reportAgentAttachmentUnavailable,
    addTrustedRule: policyActions.addTrustedRule,
    removeTrustedRule: policyActions.removeTrustedRule,
    addIgnoreRule: policyActions.addIgnoreRule,
    removeIgnoreRule: policyActions.removeIgnoreRule,
    confirmPendingRequest: approvalFlow.confirmPendingRequest,
    focusWidget: workspaceActions.focusWidget,
    focusTab: workspaceActions.focusTab,
    createTerminalTab: workspaceActions.createTerminalTab,
    createTerminalTabWithConnection: workspaceActions.createTerminalTabWithConnection,
    moveTab: workspaceActions.moveTab,
    renameTab: workspaceActions.renameTab,
    setTabPinned: workspaceActions.setTabPinned,
    closeTab: workspaceActions.closeTab,
    interruptWidget: workspaceActions.interruptWidget,
    selectConnection: connectionActions.selectConnection,
    saveSSHConnection: connectionActions.saveSSHConnection,
    refreshTerminalState,
    setActiveSelection: agentActions.setActiveSelection,
    toggleWidgetContext: () => setWidgetContextEnabled((current) => !current),
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function resolveTerminalTargetWidgetID(
  request: ExecuteToolRequest,
  response: ExecuteToolResponse,
  fallbackWidgetID: string,
) {
  const directWidgetID = (request.input as { widget_id?: string } | undefined)?.widget_id
  if (directWidgetID) {
    return directWidgetID
  }

  if (request.tool_name === 'workspace.focus_tab') {
    const output = response.output as { widget_ids?: string[] } | undefined
    const tabWidgetID = output?.widget_ids?.[0]
    if (tabWidgetID) {
      return tabWidgetID
    }
  }

  if (request.tool_name === 'workspace.create_terminal_tab') {
    const output = response.output as { widget_id?: string } | undefined
    if (output?.widget_id) {
      return output.widget_id
    }
  }

  if (request.tool_name === 'workspace.close_tab') {
    const output = response.output as { workspace?: { active_widget_id?: string } } | undefined
    if (output?.workspace?.active_widget_id) {
      return output.workspace.active_widget_id
    }
  }

  if (request.tool_name === 'workspace.focus_widget') {
    const output = response.output as { id?: string } | undefined
    if (output?.id) {
      return output.id
    }
  }

  return fallbackWidgetID
}

function readWidgetContextPreference() {
  if (typeof window === 'undefined') {
    return true
  }
  const stored = window.localStorage.getItem('rterm.widget-context-enabled')
  if (stored == null) {
    return true
  }
  return stored !== 'false'
}

function writeWidgetContextPreference(value: boolean) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem('rterm.widget-context-enabled', value ? 'true' : 'false')
}
