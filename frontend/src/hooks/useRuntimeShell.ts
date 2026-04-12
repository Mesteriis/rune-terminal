import { useEffect, useMemo, useState } from 'react'

import { RtermClient } from '../lib/api'
import { resolveRuntimeInfo } from '../lib/runtime'
import type {
  AgentCatalog,
  ApprovalGrant,
  AuditEvent,
  BootstrapPayload,
  ExecuteToolRequest,
  ExecuteToolResponse,
  IgnoreRule,
  PendingApproval,
  TerminalState,
  TrustedRule,
  Widget,
  Workspace,
} from '../types'

type SelectionTarget = 'profile' | 'role' | 'mode'

export function useRuntimeShell() {
  const [client, setClient] = useState<RtermClient | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [repoRoot, setRepoRoot] = useState('')
  const [terminalState, setTerminalState] = useState<TerminalState | null>(null)
  const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([])
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [lastResponse, setLastResponse] = useState<ExecuteToolResponse | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [pendingRequest, setPendingRequest] = useState<ExecuteToolRequest | null>(null)
  const [agentCatalog, setAgentCatalog] = useState<AgentCatalog | null>(null)

  const activeWidget = useMemo(() => {
    return workspace?.widgets.find((widget) => widget.id === workspace.active_widget_id) ?? null
  }, [workspace])

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
        setRuntimeError(error instanceof Error ? error.message : String(error))
      }
    }
    void boot()
  }, [])

  useEffect(() => {
    if (!client || !workspace) {
      return
    }
    void syncActiveView(client, workspace, repoRoot)
  }, [client, workspace, repoRoot])

  function applyBootstrap(payload: BootstrapPayload) {
    setWorkspace(payload.workspace)
    setRepoRoot(payload.repo_root)
  }

  function executionContext(nextWorkspace = workspace) {
    if (!nextWorkspace) {
      return undefined
    }
    return {
      workspace_id: nextWorkspace.id,
      repo_root: repoRoot,
      active_widget_id: nextWorkspace.active_widget_id,
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

  async function refreshAgentCatalog() {
    if (!client) {
      return
    }
    setAgentCatalog(await client.agentCatalog())
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
      return
    }
    const response = await client.executeTool({
      ...request,
      context: executionContext(workspace),
    })
    setLastResponse(response)

    if (response.status === 'requires_confirmation' && response.pending_approval) {
      setPendingApproval(response.pending_approval)
      setPendingRequest(request)
      return
    }

    setPendingApproval(null)
    setPendingRequest(null)
    await Promise.all([refreshWorkspace(), refreshAudit(), refreshPolicyLists()])
    if (request.tool_name.startsWith('term.') || request.tool_name.startsWith('workspace.')) {
      const targetWidgetID = (request.input as { widget_id?: string } | undefined)?.widget_id ?? workspace.active_widget_id
      await refreshTerminalState(targetWidgetID)
    }
  }

  async function confirmPendingRequest() {
    if (!client || !workspace || !pendingApproval || !pendingRequest) {
      return
    }
    const confirmation = await client.executeTool({
      tool_name: 'safety.confirm',
      input: { approval_id: pendingApproval.id },
      context: executionContext(workspace),
    })
    setLastResponse(confirmation)
    if (confirmation.status !== 'ok') {
      return
    }
    const grant = confirmation.output as ApprovalGrant
    await executeTool({ ...pendingRequest, approval_token: grant.approval_token })
  }

  async function focusWidget(widget: Widget) {
    await executeTool({
      tool_name: 'workspace.focus_widget',
      input: { widget_id: widget.id },
    })
  }

  async function setActiveSelection(target: SelectionTarget, id: string) {
    if (!client) {
      return
    }
    const nextCatalog =
      target === 'profile'
        ? await client.setActiveProfile(id)
        : target === 'role'
          ? await client.setActiveRole(id)
          : await client.setActiveMode(id)
    setAgentCatalog(nextCatalog)
    await refreshAudit()
  }

  return {
    client,
    workspace,
    repoRoot,
    terminalState,
    trustedRules,
    ignoreRules,
    auditEvents,
    lastResponse,
    runtimeError,
    pendingApproval,
    agentCatalog,
    activeWidget,
    executeTool,
    confirmPendingRequest,
    focusWidget,
    refreshTerminalState,
    refreshAgentCatalog,
    setActiveSelection,
  }
}
