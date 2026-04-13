import { useCallback, useState } from 'react'

import type { AgentFeedEntry } from '../types'

export function useAgentFeed() {
  const [runtimeFeed, setRuntimeFeed] = useState<AgentFeedEntry[]>([])

  const appendRuntimeFeed = useCallback((entry: Omit<AgentFeedEntry, 'id' | 'timestamp'>) => {
    setRuntimeFeed((current) => [
      ...current,
      {
        id: createClientID(),
        timestamp: new Date().toISOString(),
        ...entry,
      },
    ])
  }, [])

  return {
    runtimeFeed,
    appendRuntimeFeed,
  }
}

function createClientID() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
