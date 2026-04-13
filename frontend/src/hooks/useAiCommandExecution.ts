import { useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { resolveAgentTerminalCommand, summarizeTerminalResult, waitForTerminalOutput } from '../lib/aiTerminalCommand'
import type { ExecuteToolRequest, ExecuteToolResponse, RuntimeNotice, TerminalState, WorkspaceContextSummary } from '../types'

type ToolExecutor = (request: ExecuteToolRequest) => Promise<ExecuteToolResponse | null>
type NoticeSetter = Dispatch<SetStateAction<RuntimeNotice | null>>

type PendingCommandExplanation = {
  prompt: string
  command: string
  widgetId: string
  fromSeq: number
}

type UseAiCommandExecutionParams = {
  client: {
    terminalSnapshot: (widgetId: string, from?: number, fallbackState?: TerminalState | null) => Promise<{
      chunks: Array<{ data: string }>
      next_seq: number
    }>
  } | null
  workspaceContext: WorkspaceContextSummary | null
  activeWidgetId?: string
  terminalState: TerminalState | null
  executeTool: ToolExecutor
  appendAgentFeed: (entry: Omit<import('../types').AgentFeedEntry, 'id' | 'timestamp'>) => void
  explainTerminalCommand: (input: {
    prompt: string
    command: string
    widget_id?: string
    from_seq?: number
    approval_used?: boolean
  }) => Promise<{ provider_error?: string; output_excerpt?: string } | null>
  setNotice: NoticeSetter
}

export function useAiCommandExecution({
  client,
  workspaceContext,
  activeWidgetId,
  terminalState,
  executeTool,
  appendAgentFeed,
  explainTerminalCommand,
  setNotice,
}: UseAiCommandExecutionParams) {
  const pendingExplanationRef = useRef<PendingCommandExplanation | null>(null)

  const finalizeExplanation = useCallback(async (pending: PendingCommandExplanation, approvalUsed: boolean) => {
    if (!client) {
      return
    }
    const waited = await waitForTerminalOutput(
      (fromSeq) => client.terminalSnapshot(pending.widgetId, fromSeq, terminalState),
      pending.fromSeq,
    )
    const explanation = await explainTerminalCommand({
      prompt: pending.prompt,
      command: pending.command,
      widget_id: pending.widgetId,
      from_seq: pending.fromSeq,
      approval_used: approvalUsed,
    })
    setNotice({
      tone: explanation?.provider_error ? 'error' : 'success',
      title: explanation?.provider_error ? 'Command explanation failed' : 'AI summarized command result',
      detail: summarizeTerminalResult(
        pending.command,
        explanation?.output_excerpt ?? waited.output,
        terminalState,
      ),
    })
  }, [client, explainTerminalCommand, setNotice, terminalState])

  const submitTerminalCommandPrompt = useCallback(async (prompt: string) => {
    const resolved = resolveAgentTerminalCommand(prompt, activeWidgetId)
    if (!resolved || !client || !workspaceContext) {
      return false
    }

    const before = await client.terminalSnapshot(resolved.widgetId, 0, terminalState)
    const pending = {
      prompt: resolved.prompt,
      command: resolved.command,
      widgetId: resolved.widgetId,
      fromSeq: before.next_seq,
    }

    appendAgentFeed({
      role: 'user',
      kind: 'action',
      title: resolved.prompt,
      body: `Run \`${resolved.command}\` in the active terminal.`,
      tags: ['terminal command', '/run'],
    })

    const response = await executeTool(resolved.request)
    if (!response) {
      pendingExplanationRef.current = null
      return true
    }

    if (response.status === 'requires_confirmation' && response.pending_approval) {
      pendingExplanationRef.current = pending
      appendAgentFeed({
        role: 'assistant',
        kind: 'approval',
        tone: 'approval',
        title: `Run \`${resolved.command}\` requires approval`,
        body: response.pending_approval.summary,
        tags: [response.pending_approval.approval_tier, 'terminal command'],
        tool_name: resolved.request.tool_name,
        approval_tier: response.pending_approval.approval_tier,
        affected_widgets: response.operation?.affected_widgets,
      })
      return true
    }

    if (response.status !== 'ok') {
      pendingExplanationRef.current = null
      appendAgentFeed({
        role: 'assistant',
        kind: 'result',
        tone: 'error',
        title: `Failed to run \`${resolved.command}\``,
        body: response.error ?? response.error_code ?? 'Execution failed.',
        tags: ['terminal command', 'error'],
        tool_name: resolved.request.tool_name,
        affected_widgets: response.operation?.affected_widgets,
      })
      return true
    }

    appendAgentFeed({
      role: 'assistant',
      kind: 'result',
      tone: 'success',
      title: `Running \`${resolved.command}\``,
      body: 'The command was sent to the active terminal. Summarizing the result…',
      tags: ['terminal command', 'ok'],
      tool_name: resolved.request.tool_name,
      approval_used: resolved.request.approval_token != null,
      affected_widgets: response.operation?.affected_widgets,
    })
    pendingExplanationRef.current = null
    await finalizeExplanation(pending, resolved.request.approval_token != null)
    return true
  }, [activeWidgetId, appendAgentFeed, client, executeTool, finalizeExplanation, terminalState, workspaceContext])

  const handleApprovedTerminalCommand = useCallback(async (request: ExecuteToolRequest, response: ExecuteToolResponse) => {
    const pending = pendingExplanationRef.current
    if (!pending) {
      return
    }
    if (!matchesPendingCommand(pending, request)) {
      return
    }
    pendingExplanationRef.current = null
    if (response.status !== 'ok') {
      return
    }
    appendAgentFeed({
      role: 'assistant',
      kind: 'result',
      tone: 'success',
      title: `Running \`${pending.command}\``,
      body: 'Approval was granted and the command was sent. Summarizing the result…',
      tags: ['terminal command', 'ok', 'approval used'],
      tool_name: request.tool_name,
      approval_used: true,
      affected_widgets: response.operation?.affected_widgets,
    })
    await finalizeExplanation(pending, true)
  }, [appendAgentFeed, finalizeExplanation])

  return {
    submitTerminalCommandPrompt,
    handleApprovedTerminalCommand,
  }
}

function matchesPendingCommand(pending: PendingCommandExplanation, request: ExecuteToolRequest) {
  return request.tool_name === 'term.send_input'
    && request.input?.widget_id === pending.widgetId
    && request.input?.text === pending.command
}
