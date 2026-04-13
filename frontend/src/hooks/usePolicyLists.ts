import { useCallback, useEffect, useState } from 'react'

import { RtermClient } from '../lib/api'
import type { IgnoreRule, TrustedRule, Workspace } from '../types'

type UsePolicyListsParams = {
  client: RtermClient | null
  workspace: Workspace | null
  executionContext: (workspace?: Workspace | null) => {
    workspace_id?: string
    repo_root?: string
    active_widget_id?: string
    widget_context_enabled?: boolean
  } | undefined
}

export function usePolicyLists({ client, workspace, executionContext }: UsePolicyListsParams) {
  const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([])
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])

  const refreshPolicyLists = useCallback(async () => {
    if (!client || !workspace) {
      setTrustedRules([])
      setIgnoreRules([])
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
  }, [client, executionContext, workspace])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshPolicyLists()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [refreshPolicyLists])

  return {
    trustedRules,
    ignoreRules,
    refreshPolicyLists,
  }
}
