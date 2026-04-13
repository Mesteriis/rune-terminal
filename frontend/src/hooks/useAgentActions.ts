import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { buildAgentResponseEntry, resolveAgentPromptAction, summarizeRequest } from '../lib/agentFeed'
import type { AgentCatalog, ExecuteToolRequest, ExecuteToolResponse, RuntimeNotice, Workspace } from '../types'

type ToolExecutor = (request: ExecuteToolRequest) => Promise<ExecuteToolResponse | null>
type NoticeSetter = Dispatch<SetStateAction<RuntimeNotice | null>>

type UseAgentActionsParams = {
  client: {
    setActiveProfile: (id: string) => Promise<AgentCatalog>
    setActiveRole: (id: string) => Promise<AgentCatalog>
    setActiveMode: (id: string) => Promise<AgentCatalog>
  } | null
  workspace: Workspace | null
  executeTool: ToolExecutor
  appendAgentFeed: (entry: Omit<import('../types').AgentFeedEntry, 'id' | 'timestamp'>) => void
  submitConversationPrompt: (prompt: string) => Promise<void>
  refreshAudit: () => Promise<void>
  setAgentCatalog: (catalog: AgentCatalog) => void
  setNotice: NoticeSetter
}

type SelectionTarget = 'profile' | 'role' | 'mode'

export function useAgentActions({
  client,
  workspace,
  executeTool,
  appendAgentFeed,
  submitConversationPrompt,
  refreshAudit,
  setAgentCatalog,
  setNotice,
}: UseAgentActionsParams) {
  const runAgentAction = useCallback(async (label: string, request: ExecuteToolRequest) => {
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
  }, [appendAgentFeed, executeTool])

  const submitAgentPrompt = useCallback(async (prompt: string) => {
    const activeWidgetID = workspace?.active_widget_id
    const action = resolveAgentPromptAction(prompt, activeWidgetID)
    if (!action) {
      await submitConversationPrompt(prompt)
      return
    }

    appendAgentFeed({
      role: 'user',
      kind: 'action',
      title: prompt,
      tags: ['composer'],
    })
    const response = await executeTool(action.request)
    if (response) {
      appendAgentFeed(buildAgentResponseEntry(action.request, response, action.label))
    }
  }, [appendAgentFeed, executeTool, submitConversationPrompt, workspace?.active_widget_id])

  const reportAgentAttachmentUnavailable = useCallback(async () => {
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
  }, [appendAgentFeed, setNotice])

  const setActiveSelection = useCallback(async (target: SelectionTarget, id: string) => {
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
      const title = `${capitalize(target)} updated`
      const detail =
        target === 'profile'
          ? nextCatalog.active.profile.name
          : target === 'role'
            ? nextCatalog.active.role.name
            : nextCatalog.active.mode.name
      setNotice({
        tone: 'success',
        title,
        detail,
      })
      appendAgentFeed({
        role: 'assistant',
        kind: 'system',
        tone: 'success',
        title,
        body: detail,
        tags: [target],
      })
    } catch (error) {
      setNotice({
        tone: 'error',
        title: `Failed to update ${target}`,
        detail: formatError(error),
      })
    }
  }, [appendAgentFeed, client, refreshAudit, setAgentCatalog, setNotice])

  return {
    runAgentAction,
    submitAgentPrompt,
    reportAgentAttachmentUnavailable,
    setActiveSelection,
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
