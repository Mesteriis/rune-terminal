import { useCallback, useState } from 'react'

import type { AgentFeedEntry } from '../types'

export function useAgentFeed() {
  const [agentFeed, setAgentFeed] = useState<AgentFeedEntry[]>([])

  const appendAgentFeed = useCallback((entry: Omit<AgentFeedEntry, 'id' | 'timestamp'>) => {
    setAgentFeed((current) => [
      ...current,
      {
        id: createClientID(),
        timestamp: new Date().toISOString(),
        ...entry,
      },
    ])
  }, [])

  return {
    agentFeed,
    appendAgentFeed,
  }
}

function createClientID() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
