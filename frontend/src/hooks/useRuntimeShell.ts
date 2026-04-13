import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRuntimeBootstrap } from './useRuntimeBootstrap'
import { useTerminalState } from './useTerminalState'
import type {
  AgentFeedEntry,
  ApprovalGrant,
  ExecuteToolRequest,
  ExecuteToolResponse,
  IgnoreRule,
  PendingApproval,
  RuntimeNotice,
  TrustedRule,
  Widget,
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
  const bootstrap = useRuntimeBootstrap()
  const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([])
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])
  const [lastResponse, setLastResponse] = useState<ExecuteToolResponse | null>(null)
  const [notice, setNotice] = useState<RuntimeNotice | null>(null)
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [pendingRequest, setPendingRequest] = useState<ExecuteToolRequest | null>(null)
  const [isConfirmingApproval, setIsConfirmingApproval] = useState(false)
  const [agentFeed, setAgentFeed] = useState<AgentFeedEntry[]>([])

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
      widget_context_enabled: widgetContextEnabled,
    }
  }, [bootstrap.repoRoot, bootstrap.workspace, widgetContextEnabled])

  async function refreshWorkspace() {
    if (!bootstrap.client) {
      return
    }
    const nextWorkspace = await bootstrap.client.workspace()
    bootstrap.setWorkspace(nextWorkspace)
  }

  async function refreshAudit() {
    if (!bootstrap.client) {
      return
    }
    const audit = await bootstrap.client.audit()
    bootstrap.setAuditEvents(audit.events ?? [])
  }

  const refreshPolicyLists = useCallback(async () => {
    if (!bootstrap.client || !bootstrap.workspace) {
      return
    }
    const [trusted, ignore] = await Promise.all([
      bootstrap.client.executeTool({
        tool_name: 'safety.list_trusted_rules',
        context: executionContext(bootstrap.workspace),
      }),
      bootstrap.client.executeTool({
        tool_name: 'safety.list_ignore_rules',
        context: executionContext(bootstrap.workspace),
      }),
    ])
    if (trusted.status === 'ok') {
      setTrustedRules(((trusted.output as { rules?: TrustedRule[] })?.rules ?? []) as TrustedRule[])
    }
    if (ignore.status === 'ok') {
      setIgnoreRules(((ignore.output as { rules?: IgnoreRule[] })?.rules ?? []) as IgnoreRule[])
    }
  }, [bootstrap.client, bootstrap.workspace, executionContext])

  useEffect(() => {
    if (!bootstrap.client || !bootstrap.workspace) {
      return
    }
    void refreshPolicyLists()
  }, [bootstrap.client, bootstrap.workspace, refreshPolicyLists])

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

  async function confirmPendingRequest() {
    if (!bootstrap.client || !bootstrap.workspace || !pendingApproval || !pendingRequest) {
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
        tool_name: pendingApproval.tool_name,
        approval_tier: pendingApproval.approval_tier,
      })
      const confirmation = await bootstrap.client.executeTool({
        tool_name: 'safety.confirm',
        input: { approval_id: pendingApproval.id },
        context: executionContext(bootstrap.workspace),
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
        tool_name: pendingApproval.tool_name,
        approval_tier: pendingApproval.approval_tier,
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
      tool_name: request.tool_name,
    })
    const response = await executeTool(request)
    if (response) {
      appendAgentFeed(buildAgentResponseEntry(request, response))
    }
    return response
  }

  async function submitAgentPrompt(prompt: string) {
    appendAgentFeed({
      role: 'user',
      kind: 'action',
      title: prompt,
      tags: ['composer'],
    })

    const activeWidgetID = bootstrap.workspace?.active_widget_id
    const action = resolveAgentPromptAction(prompt, activeWidgetID)
    if (!action) {
      appendAgentFeed({
        role: 'assistant',
        kind: 'system',
        tone: 'info',
        title: 'Conversation backend is not available yet',
        body: 'Use prompts like "inspect terminal", "list tabs", "list widgets", "show active tab", or "interrupt terminal", or open the tool console for arbitrary runtime calls.',
        tags: ['mvp compromise', 'composer'],
      })
      return
    }

    const response = await executeTool(action.request)
    if (response) {
      appendAgentFeed(buildAgentResponseEntry(action.request, response, action.label))
    }
  }

  async function reportAgentAttachmentUnavailable() {
    appendAgentFeed({
      role: 'user',
      kind: 'action',
      title: 'Attach files',
      body: 'Requested file attachment from the AI composer.',
      tags: ['attachment'],
    })
    appendAgentFeed({
      role: 'assistant',
      kind: 'system',
      tone: 'info',
      title: 'File attachments are not wired into the new runtime yet',
      body: 'The TideTerm-shaped attach control is present for parity, but file upload and attachment-to-agent transport still need a dedicated backend path.',
      tags: ['mvp compromise', 'attachment'],
    })
    setNotice({
      tone: 'info',
      title: 'Attachment flow not available yet',
      detail: 'AI file upload still needs a dedicated transport path in RunaTerminal.',
    })
  }

  async function setActiveSelection(target: SelectionTarget, id: string) {
    if (!bootstrap.client) {
      return
    }
    try {
      const nextCatalog =
        target === 'profile'
          ? await bootstrap.client.setActiveProfile(id)
          : target === 'role'
            ? await bootstrap.client.setActiveRole(id)
            : await bootstrap.client.setActiveMode(id)
      bootstrap.setAgentCatalog(nextCatalog)
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
    client: bootstrap.client,
    workspace: bootstrap.workspace,
    workspaceContext,
    repoRoot: bootstrap.repoRoot,
    tools: bootstrap.tools,
    terminalState,
    trustedRules,
    ignoreRules,
    auditEvents: bootstrap.auditEvents,
    lastResponse,
    runtimeError: bootstrap.runtimeError,
    notice,
    pendingApproval,
    agentFeed,
    isConfirmingApproval,
    agentCatalog: bootstrap.agentCatalog,
    activeWidget,
    activeTab,
    widgetContextEnabled,
    clearNotice: () => setNotice(null),
    executeTool,
    runAgentAction,
    submitAgentPrompt,
    reportAgentAttachmentUnavailable,
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

function buildAgentResponseEntry(
  request: ExecuteToolRequest,
  response: ExecuteToolResponse,
  label?: string,
): Omit<AgentFeedEntry, 'id' | 'timestamp'> {
  if (response.status === 'requires_confirmation' && response.pending_approval) {
    return {
      role: 'assistant',
      kind: 'approval',
      tone: 'approval',
      title: label ? `${label} requires approval` : `${request.tool_name} requires approval`,
      body: response.pending_approval.summary,
      tags: [response.pending_approval.approval_tier],
      tool_name: request.tool_name,
      operation_summary: response.operation?.summary,
      approval_tier: response.pending_approval.approval_tier,
      affected_paths: response.operation?.affected_paths,
      affected_widgets: response.operation?.affected_widgets,
    }
  }
  if (response.status === 'ok') {
    return {
      role: 'assistant',
      kind: 'result',
      tone: 'success',
      title: response.operation?.summary ?? label ?? `${request.tool_name} completed`,
      body: summarizeOutput(response.output),
      tags: [request.tool_name, 'ok'],
      tool_name: request.tool_name,
      operation_summary: response.operation?.summary,
      approval_tier: response.operation?.approval_tier,
      approval_used: request.approval_token != null,
      affected_paths: response.operation?.affected_paths,
      affected_widgets: response.operation?.affected_widgets,
    }
  }
  return {
    role: 'assistant',
    kind: 'result',
    tone: 'error',
    title: `${request.tool_name} failed`,
    body: response.error ?? response.error_code ?? 'Execution failed.',
    tags: [request.tool_name, 'error'],
    tool_name: request.tool_name,
    operation_summary: response.operation?.summary,
    approval_tier: response.operation?.approval_tier,
    approval_used: request.approval_token != null,
    affected_paths: response.operation?.affected_paths,
    affected_widgets: response.operation?.affected_widgets,
  }
}

function createClientID() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function resolveAgentPromptAction(prompt: string, activeWidgetID?: string): { label: string; request: ExecuteToolRequest } | null {
  const normalized = prompt.trim().toLowerCase()

  if (
    normalized.includes('inspect terminal') ||
    normalized.includes('terminal state') ||
    normalized.includes('terminal status') ||
    normalized.includes('inspect session')
  ) {
    return {
      label: 'Inspect terminal',
      request: { tool_name: 'term.get_state' },
    }
  }

  if (
    normalized.includes('list tabs') ||
    normalized.includes('show tabs') ||
    normalized.includes('tab list') ||
    normalized.includes('show active tab')
  ) {
    return normalized.includes('active tab')
      ? {
          label: 'Show active tab',
          request: { tool_name: 'workspace.get_active_tab' },
        }
      : {
          label: 'List tabs',
          request: { tool_name: 'workspace.list_tabs' },
        }
  }

  if (normalized.includes('list widgets') || normalized.includes('show widgets') || normalized.includes('widget list')) {
    return {
      label: 'List widgets',
      request: { tool_name: 'workspace.list_widgets' },
    }
  }

  if ((normalized.includes('interrupt') || normalized.includes('stop terminal') || normalized.includes('stop command')) && activeWidgetID) {
    return {
      label: 'Interrupt terminal',
      request: { tool_name: 'term.interrupt', input: { widget_id: activeWidgetID } },
    }
  }

  return null
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
