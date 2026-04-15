import { useCallback } from 'react'

import type { ExecuteToolResponse } from '../types'

type ToolRequest = {
  tool_name: string
  input?: Record<string, unknown>
}

type ToolExecutor = (request: ToolRequest) => Promise<ExecuteToolResponse | null>

type UsePolicyActionsParams = {
  executeTool: ToolExecutor
}

export function usePolicyActions({ executeTool }: UsePolicyActionsParams) {
  const addTrustedRule = useCallback(
    async (input: {
      scope: string
      matcher: string
      note?: string
    }) =>
      executeTool({
        tool_name: 'safety.add_trusted_rule',
        input: {
          scope: input.scope,
          subject_type: 'tool',
          matcher_type: 'exact',
          matcher: input.matcher,
          note: input.note ?? 'Settings surface',
        },
      }),
    [executeTool],
  )

  const removeTrustedRule = useCallback(
    async (ruleId: string) =>
      executeTool({
        tool_name: 'safety.remove_trusted_rule',
        input: { rule_id: ruleId },
      }),
    [executeTool],
  )

  const addIgnoreRule = useCallback(
    async (input: {
      pattern: string
      mode: string
      note?: string
    }) =>
      executeTool({
        tool_name: 'safety.add_ignore_rule',
        input: {
          scope: 'repo',
          matcher_type: 'glob',
          pattern: input.pattern,
          mode: input.mode,
          note: input.note ?? 'Settings surface',
        },
      }),
    [executeTool],
  )

  const removeIgnoreRule = useCallback(
    async (ruleId: string) =>
      executeTool({
        tool_name: 'safety.remove_ignore_rule',
        input: { rule_id: ruleId },
      }),
    [executeTool],
  )

  return {
    addTrustedRule,
    removeTrustedRule,
    addIgnoreRule,
    removeIgnoreRule,
  }
}
