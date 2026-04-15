import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { ApprovalGrant, ExecuteToolRequest, ExecuteToolResponse, PendingApproval, RuntimeNotice, Workspace } from '../types'

type ToolExecutor = (request: ExecuteToolRequest) => Promise<ExecuteToolResponse | null>
type NoticeSetter = Dispatch<SetStateAction<RuntimeNotice | null>>
type ResponseSetter = Dispatch<SetStateAction<ExecuteToolResponse | null>>

type UseApprovalFlowParams = {
  client: {
    executeTool: (request: ExecuteToolRequest) => Promise<ExecuteToolResponse>
  } | null
  workspace: Workspace | null
  executionContext: (workspace?: Workspace | null) => {
    workspace_id?: string
    repo_root?: string
    active_widget_id?: string
  } | undefined
  executeTool: ToolExecutor
  refreshAudit: () => Promise<void>
  appendAgentFeed: (entry: {
    role: 'user' | 'assistant'
    kind: 'approval'
    title: string
    body?: string
    tone?: 'approval'
    tags?: string[]
    tool_name?: string
    approval_tier?: string
  }) => void
  onApprovedExecution?: (request: ExecuteToolRequest, response: ExecuteToolResponse) => void | Promise<void>
  setLastResponse: ResponseSetter
  setNotice: NoticeSetter
}

export function useApprovalFlow({
  client,
  workspace,
  executionContext,
  executeTool,
  refreshAudit,
  appendAgentFeed,
  onApprovedExecution,
  setLastResponse,
  setNotice,
}: UseApprovalFlowParams) {
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [pendingRequest, setPendingRequest] = useState<ExecuteToolRequest | null>(null)
  const [isConfirmingApproval, setIsConfirmingApproval] = useState(false)

  const registerPendingApproval = useCallback((request: ExecuteToolRequest, response: ExecuteToolResponse) => {
    if (response.status !== 'requires_confirmation' || !response.pending_approval) {
      setPendingApproval(null)
      setPendingRequest(null)
      return false
    }

    setPendingApproval(response.pending_approval)
    setPendingRequest(request)
    setNotice({
      tone: 'info',
      title: `${request.tool_name} needs approval`,
      detail: response.pending_approval.summary,
    })
    return true
  }, [setNotice])

  const clearPendingApproval = useCallback(() => {
    setPendingApproval(null)
    setPendingRequest(null)
  }, [])

  const confirmPendingRequest = useCallback(async () => {
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
        tool_name: pendingApproval.tool_name,
        approval_tier: pendingApproval.approval_tier,
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
        tool_name: pendingApproval.tool_name,
        approval_tier: pendingApproval.approval_tier,
      })
      setNotice({
        tone: 'info',
        title: 'Approval granted',
        detail: 'Retrying the requested action with a single-use approval token.',
      })
      const retried = await executeTool({ ...pendingRequest, approval_token: grant.approval_token })
      if (retried && onApprovedExecution) {
        await onApprovedExecution(pendingRequest, retried)
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Approval confirmation request failed',
        detail: formatError(error),
      })
    } finally {
      setIsConfirmingApproval(false)
    }
  }, [
    appendAgentFeed,
    client,
    executeTool,
    executionContext,
    onApprovedExecution,
    pendingApproval,
    pendingRequest,
    refreshAudit,
    setLastResponse,
    setNotice,
    workspace,
  ])

  return {
    pendingApproval,
    isConfirmingApproval,
    registerPendingApproval,
    clearPendingApproval,
    confirmPendingRequest,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
