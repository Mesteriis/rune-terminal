import { useEffect, useRef } from 'react'

import type { AgentFeedEntry } from '../types'
import { AgentTranscriptMessage } from './AgentTranscriptMessage'

type AgentTranscriptProps = {
  entries: AgentFeedEntry[]
}

export function AgentTranscript({ entries }: AgentTranscriptProps) {
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'end' })
  }, [entries])

  if (entries.length === 0) {
    return null
  }

  return (
    <section className="agent-transcript">
      {entries.map((entry) => <AgentTranscriptMessage key={entry.id} entry={entry} />)}
      <div ref={transcriptEndRef} />
    </section>
  )
}
