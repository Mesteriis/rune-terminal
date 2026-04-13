import { useEffect, useRef } from 'react'

import type { AgentFeedEntry } from '../types'

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
      {entries.map((entry) => (
        <article
          key={entry.id}
          className={[
            'ai-message-card',
            entry.role === 'user' ? 'ai-message-user' : 'ai-message-assistant',
            entry.tone === 'error' ? 'ai-message-error' : '',
            entry.tone === 'approval' ? 'ai-message-approval' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <header>
            <span className="ai-message-badge">{entry.role === 'user' ? 'You' : 'RunaTerminal AI'}</span>
            <small>{formatTimestamp(entry.timestamp)}</small>
          </header>
          <strong>{entry.title}</strong>
          {entry.body ? <p>{entry.body}</p> : null}
          {entry.tags && entry.tags.length > 0 ? (
            <div className="ai-message-tags">
              {entry.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
        </article>
      ))}
      <div ref={transcriptEndRef} />
    </section>
  )
}

function formatTimestamp(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
