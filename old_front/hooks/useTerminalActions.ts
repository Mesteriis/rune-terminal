import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { ExecuteToolRequest, ExecuteToolResponse, RuntimeNotice } from '../types'
import { RtermClient } from '../lib/api'

type ToolExecutor = (request: ExecuteToolRequest) => Promise<ExecuteToolResponse | null>
type NoticeSetter = Dispatch<SetStateAction<RuntimeNotice | null>>

type UseTerminalActionsParams = {
  client: RtermClient | null
  executeTool: ToolExecutor
  setNotice: NoticeSetter
}

export function useTerminalActions({ client, executeTool, setNotice }: UseTerminalActionsParams) {
  const submitTerminalInput = useCallback(async (widgetId: string, text: string, appendNewline = false) => {
    if (!client) {
      return false
    }
    try {
      await client.sendTerminalInput(widgetId, text, appendNewline)
      return true
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Terminal input request failed',
        detail: formatError(error),
      })
      return false
    }
  }, [client, setNotice])

  const interruptWidget = useCallback(async (widgetId: string) => {
    if (!widgetId) {
      return null
    }
    return executeTool({
      tool_name: 'term.interrupt',
      input: { widget_id: widgetId },
    })
  }, [executeTool])

  return {
    submitTerminalInput,
    interruptWidget,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
