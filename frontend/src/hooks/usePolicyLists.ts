import { useCallback, useEffect, useState } from 'react'

import { RtermClient } from '../lib/api'
import type { IgnoreRule, TrustedRule } from '../types'

type UsePolicyListsParams = {
  client: RtermClient | null
}

export function usePolicyLists({ client }: UsePolicyListsParams) {
  const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([])
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])

  const refreshPolicyLists = useCallback(async () => {
    if (!client) {
      setTrustedRules([])
      setIgnoreRules([])
      return
    }

    try {
      const [trusted, ignore] = await Promise.all([
        client.trustedRules(),
        client.ignoreRules(),
      ])

      setTrustedRules(trusted.rules ?? [])
      setIgnoreRules(ignore.rules ?? [])
    } catch {
      setTrustedRules([])
      setIgnoreRules([])
    }
  }, [client])

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
