import type { AgentFeedEntry, ExecuteToolRequest, ExecuteToolResponse } from '../types'

export function summarizeOutput(output: unknown) {
  if (!output) {
    return 'No output payload.'
  }
  if (typeof output === 'string') {
    return output
  }
  if (isTerminalState(output)) {
    return [
      `Status: ${output.status}`,
      `Shell: ${output.shell}`,
      output.working_dir ? `Working dir: ${output.working_dir}` : null,
      output.pid ? `PID: ${output.pid}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (hasNamedList(output, 'tabs')) {
    return `Tabs:\n${output.tabs.map((tab) => `• ${tab.title}`).join('\n')}`
  }
  if (hasNamedList(output, 'widgets')) {
    return `Widgets:\n${output.widgets.map((widget) => `• ${widget.title}`).join('\n')}`
  }
  if (hasNamedList(output, 'rules')) {
    return `Rules:\n${output.rules
      .map((rule) => `• ${rule.pattern ?? rule.matcher ?? rule.id}`)
      .join('\n')}`
  }
  if (typeof output === 'object') {
    return JSON.stringify(output, null, 2)
  }
  return String(output)
}

export function summarizeRequest(request: ExecuteToolRequest) {
  if (!request.input || Object.keys(request.input).length === 0) {
    return request.tool_name
  }
  return `${request.tool_name} ${JSON.stringify(request.input)}`
}

function isTerminalState(output: unknown): output is {
  status: string
  shell: string
  working_dir?: string
  pid?: number
} {
  return typeof output === 'object' && output !== null && 'status' in output && 'shell' in output
}

function hasNamedList<T extends { title?: string; pattern?: string; matcher?: string; id?: string }>(
  output: unknown,
  key: string,
): output is Record<string, T[]> {
  return typeof output === 'object' && output !== null && key in output && Array.isArray((output as Record<string, unknown>)[key])
}

export function buildAgentResponseEntry(
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

export function resolveAgentPromptAction(
  prompt: string,
  activeWidgetID?: string,
): { label: string; request: ExecuteToolRequest } | null {
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
