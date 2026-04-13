import { useEffect, useMemo, useState } from 'react'

import { RtermClient } from '../lib/api'
import { resolveRuntimeInfo } from '../lib/runtime'
import type {
  AgentCatalog,
  AgentFeedEntry,
  ApprovalGrant,
  AuditEvent,
  BootstrapPayload,
  ExecuteToolRequest,
  ExecuteToolResponse,
  IgnoreRule,
  PendingApproval,
  RuntimeNotice,
  TerminalState,
  ToolInfo,
  TrustedRule,
  Widget,
  Workspace,
  WorkspaceContextSummary,
} from '../types'

type SelectionTarget = 'profile' | 'role' | 'mode'

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
  const [client, setClient] = useState<RtermClient | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [repoRoot, setRepoRoot] = useState('')
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [terminalState, setTerminalState] = useState<TerminalState | null>(null)
  const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([])
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [lastResponse, setLastResponse] = useState<ExecuteToolResponse | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [notice, setNotice] = useState<RuntimeNotice | null>(null)
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [pendingRequest, setPendingRequest] = useState<ExecuteToolRequest | null>(null)
  const [isConfirmingApproval, setIsConfirmingApproval] = useState(false)
  const [agentCatalog, setAgentCatalog] = useState<AgentCatalog | null>(null)
  const [agentFeed, setAgentFeed] = useState<AgentFeedEntry[]>([])

  const activeWidget = useMemo(() => {
    return workspace?.widgets.find((widget) => widget.id === workspace.active_widget_id) ?? null
  }, [workspace])

  const activeTab = useMemo(() => {
    return workspace?.tabs.find((tab) => tab.id === workspace.active_tab_id) ?? null
  }, [workspace])

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

  useEffect(() => {
    async function boot() {
      try {
        const runtime = await resolveRuntimeInfo()
        const nextClient = new RtermClient(runtime)
        setClient(nextClient)
        const [bootstrap, audit, agent] = await Promise.all([
          nextClient.bootstrap(),
          nextClient.audit(),
          nextClient.agentCatalog(),
        ])
        applyBootstrap(bootstrap)
        setAuditEvents(audit.events ?? [])
        setAgentCatalog(agent)
      } catch (error) {
        setRuntimeError(formatError(error))
      }
    }
    void boot()
  }, [])

  useEffect(() => {
    if (!client || !workspace) {
      return
    }
    void syncActiveView(client, workspace, repoRoot)
  }, [client, repoRoot, workspace])

  useEffect(() => {
    writeWidgetContextPreference(widgetContextEnabled)
  }, [widgetContextEnabled])

  function applyBootstrap(payload: BootstrapPayload) {
    setWorkspace(payload.workspace)
    setRepoRoot(payload.repo_root)
    setTools(payload.tools ?? [])
  }

  function executionContext(nextWorkspace = workspace): WorkspaceContextSummary | undefined {
    if (!nextWorkspace) {
      return undefined
    }
    return {
      workspace_id: nextWorkspace.id,
      repo_root: repoRoot,
      active_widget_id: widgetContextEnabled ? nextWorkspace.active_widget_id : undefined,
      widget_context_enabled: widgetContextEnabled,
    }
  }

  async function syncActiveView(nextClient: RtermClient, nextWorkspace: Workspace, nextRepoRoot: string) {
    const context = {
      workspace_id: nextWorkspace.id,
      repo_root: nextRepoRoot,
      active_widget_id: nextWorkspace.active_widget_id,
    }
    const [terminal, trusted, ignore] = await Promise.all([
      nextClient.executeTool({
        tool_name: 'term.get_state',
        input: { widget_id: nextWorkspace.active_widget_id },
        context,
      }),
      nextClient.executeTool({
        tool_name: 'safety.list_trusted_rules',
        context,
      }),
      nextClient.executeTool({
        tool_name: 'safety.list_ignore_rules',
        context,
      }),
    ])
    setLastResponse(terminal)
    if (terminal.status === 'ok') {
      setTerminalState(terminal.output as TerminalState)
    }
    if (trusted.status === 'ok') {
      setTrustedRules(((trusted.output as { rules?: TrustedRule[] })?.rules ?? []) as TrustedRule[])
    }
    if (ignore.status === 'ok') {
      setIgnoreRules(((ignore.output as { rules?: IgnoreRule[] })?.rules ?? []) as IgnoreRule[])
    }
  }

  async function refreshWorkspace() {
    if (!client) {
      return
    }
    const nextWorkspace = await client.workspace()
    setWorkspace(nextWorkspace)
  }

  async function refreshAudit() {
    if (!client) {
      return
    }
    const audit = await client.audit()
    setAuditEvents(audit.events ?? [])
  }

  async function refreshTerminalState(widgetId = workspace?.active_widget_id) {
    if (!client || !workspace || !widgetId) {
      return
    }
    const response = await client.executeTool({
      tool_name: 'term.get_state',
      input: { widget_id: widgetId },
      context: executionContext(workspace),
    })
    setLastResponse(response)
    if (response.status === 'ok') {
      setTerminalState(response.output as TerminalState)
    }
  }

  async function refreshPolicyLists() {
    if (!client || !workspace) {
      return
    }
    const [trusted, ignore] = await Promise.all([
      client.executeTool({
        tool_name: 'safety.list_trusted_rules',
        context: executionContext(workspace),
      }),
      client.executeTool({
        tool_name: 'safety.list_ignore_rules',
        context: executionContext(workspace),
      }),
    ])
    if (trusted.status === 'ok') {
      setTrustedRules(((trusted.output as { rules?: TrustedRule[] })?.rules ?? []) as TrustedRule[])
    }
    if (ignore.status === 'ok') {
      setIgnoreRules(((ignore.output as { rules?: IgnoreRule[] })?.rules ?? []) as IgnoreRule[])
    }
  }

  async function executeTool(request: ExecuteToolRequest) {
    if (!client || !workspace) {
      return null
    }

    try {
      const response = await client.executeTool({
        ...request,
        context: executionContext(workspace),
      })
      setLastResponse(response)
      await refreshAudit()

      if (response.status === 'requires_confirmation' && response.pending_approval) {
        setPendingApproval(response.pending_approval)
        setPendingRequest(request)
        setNotice({
          tone: 'info',
          title: `${request.tool_name} needs approval`,
          detail: response.pending_approval.summary,
        })
        return response
      }

      setPendingApproval(null)
      setPendingRequest(null)

      if (response.status === 'ok') {
        await Promise.all([refreshWorkspace(), refreshPolicyLists()])
        if (request.tool_name.startsWith('term.') || request.tool_name.startsWith('workspace.')) {
          const targetWidgetID = resolveTerminalTargetWidgetID(request, response, workspace.active_widget_id)
          await refreshTerminalState(targetWidgetID)
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

  async function confirmPendingRequest() {
    if (!client || !workspace || !pendingApproval || !pendingRequest) {
      return
    }
    setIsConfirmingApproval(true)
    try {
      appendAgentFeed({
        role: 'user',
        kind: 'approval',
        title: `Approve ${pendingApproval.tool_name}`,
        body: pendingApproval.summary,
        tags: [pendingApproval.approval_tier],
      })
      const confirmation = await client.executeTool({
        tool_name: 'safety.confirm',
        input: { approval_id: pendingApproval.id },
        context: executionContext(workspace),
      })
      setLastResponse(confirmation)
      await refreshAudit()
      if (confirmation.status !== 'ok') {
        setNotice({
          tone: 'error',
          title: 'Approval confirmation failed',
          detail: confirmation.error ?? 'The runtime rejected the approval request.',
        })
        return
      }
      const grant = confirmation.output as ApprovalGrant
      appendAgentFeed({
        role: 'assistant',
        kind: 'approval',
        tone: 'approval',
        title: 'Approval granted',
        body: 'Retrying the requested action with a single-use approval token.',
        tags: [pendingApproval.tool_name],
      })
      setNotice({
        tone: 'info',
        title: 'Approval granted',
        detail: 'Retrying the requested action with a single-use approval token.',
      })
      await executeTool({ ...pendingRequest, approval_token: grant.approval_token })
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Approval confirmation request failed',
        detail: formatError(error),
      })
    } finally {
      setIsConfirmingApproval(false)
    }
  }

  async function focusWidget(widget: Widget) {
    await executeTool({
      tool_name: 'workspace.focus_widget',
      input: { widget_id: widget.id },
    })
  }

  async function focusTab(tabId: string) {
    await executeTool({
      tool_name: 'workspace.focus_tab',
      input: { tab_id: tabId },
    })
  }

  async function createTerminalTab(title?: string) {
    await executeTool({
      tool_name: 'workspace.create_terminal_tab',
      input: title ? { title } : {},
    })
  }

  async function renameTab(tabId: string, title: string) {
    await executeTool({
      tool_name: 'workspace.rename_tab',
      input: { tab_id: tabId, title },
    })
  }

  async function setTabPinned(tabId: string, pinned: boolean) {
    await executeTool({
      tool_name: 'workspace.set_tab_pinned',
      input: { tab_id: tabId, pinned },
    })
  }

  async function moveTab(tabId: string, beforeTabId: string) {
    await executeTool({
      tool_name: 'workspace.move_tab',
      input: { tab_id: tabId, before_tab_id: beforeTabId },
    })
  }

  async function closeTab(tabId: string) {
    await executeTool({
      tool_name: 'workspace.close_tab',
      input: { tab_id: tabId },
    })
  }

  async function interruptWidget(widgetId: string) {
    await executeTool({
      tool_name: 'term.interrupt',
      input: { widget_id: widgetId },
    })
  }

  async function runAgentAction(label: string, request: ExecuteToolRequest) {
    appendAgentFeed({
      role: 'user',
      kind: 'action',
      title: label,
      body: summarizeRequest(request),
      tags: [request.tool_name],
    })
    const response = await executeTool(request)
    if (response) {
      appendAgentFeed(buildAgentResponseEntry(request, response))
    }
    return response
  }

  async function setActiveSelection(target: SelectionTarget, id: string) {
    if (!client) {
      return
    }
    try {
      const nextCatalog =
        target === 'profile'
          ? await client.setActiveProfile(id)
          : target === 'role'
            ? await client.setActiveRole(id)
            : await client.setActiveMode(id)
      setAgentCatalog(nextCatalog)
      await refreshAudit()
      setNotice({
        tone: 'success',
        title: `${capitalize(target)} updated`,
        detail:
          target === 'profile'
            ? nextCatalog.active.profile.name
            : target === 'role'
              ? nextCatalog.active.role.name
              : nextCatalog.active.mode.name,
      })
      appendAgentFeed({
        role: 'assistant',
        kind: 'system',
        tone: 'success',
        title: `${capitalize(target)} updated`,
        body:
          target === 'profile'
            ? nextCatalog.active.profile.name
            : target === 'role'
              ? nextCatalog.active.role.name
              : nextCatalog.active.mode.name,
        tags: [target],
      })
    } catch (error) {
      setNotice({
        tone: 'error',
        title: `Failed to update ${target}`,
        detail: formatError(error),
      })
    }
  }

  return {
    client,
    workspace,
    workspaceContext,
    repoRoot,
    tools,
    terminalState,
    trustedRules,
    ignoreRules,
    auditEvents,
    lastResponse,
    runtimeError,
    notice,
    pendingApproval,
    agentFeed,
    isConfirmingApproval,
    agentCatalog,
    activeWidget,
    activeTab,
    widgetContextEnabled,
    clearNotice: () => setNotice(null),
    executeTool,
    runAgentAction,
    confirmPendingRequest,
    focusWidget,
    focusTab,
    createTerminalTab,
    moveTab,
    renameTab,
    setTabPinned,
    closeTab,
    interruptWidget,
    refreshTerminalState,
    setActiveSelection,
    toggleWidgetContext: () => setWidgetContextEnabled((current) => !current),
  }

  function appendAgentFeed(entry: Omit<AgentFeedEntry, 'id' | 'timestamp'>) {
    setAgentFeed((current) => [
      ...current,
      {
        id: createClientID(),
        timestamp: new Date().toISOString(),
        ...entry,
      },
    ])
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function summarizeOutput(output: unknown) {
  if (!output) {
    return 'No output payload.'
  }
  if (typeof output === 'string') {
    return output
  }
  if (typeof output === 'object') {
    return JSON.stringify(output)
  }
  return String(output)
}

function summarizeRequest(request: ExecuteToolRequest) {
  if (!request.input || Object.keys(request.input).length === 0) {
    return request.tool_name
  }
  return `${request.tool_name} ${JSON.stringify(request.input)}`
}

function buildAgentResponseEntry(request: ExecuteToolRequest, response: ExecuteToolResponse): Omit<AgentFeedEntry, 'id' | 'timestamp'> {
  if (response.status === 'requires_confirmation' && response.pending_approval) {
    return {
      role: 'assistant',
      kind: 'approval',
      tone: 'approval',
      title: `${request.tool_name} requires approval`,
      body: response.pending_approval.summary,
      tags: [response.pending_approval.approval_tier],
    }
  }
  if (response.status === 'ok') {
    return {
      role: 'assistant',
      kind: 'result',
      tone: 'success',
      title: response.operation?.summary ?? `${request.tool_name} completed`,
      body: summarizeOutput(response.output),
      tags: [request.tool_name, 'ok'],
    }
  }
  return {
    role: 'assistant',
    kind: 'result',
    tone: 'error',
    title: `${request.tool_name} failed`,
    body: response.error ?? response.error_code ?? 'Execution failed.',
    tags: [request.tool_name, 'error'],
  }
}

function createClientID() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
