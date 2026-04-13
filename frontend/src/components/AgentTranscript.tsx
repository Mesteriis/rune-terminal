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
          {entry.tool_name ? (
            <div className="ai-tooluse-row">
              <span className={`ai-tooluse-status ai-tooluse-status-${resolveStatusTone(entry)}`} />
              <strong>{entry.tool_name}</strong>
            </div>
          ) : null}
          <strong>{entry.title}</strong>
          {entry.body ? <p>{entry.body}</p> : null}
          {entry.operation_summary && entry.operation_summary !== entry.title ? (
            <div className="ai-tooluse-detail">
              <span className="ai-tooluse-detail-label">Operation</span>
              <span>{entry.operation_summary}</span>
            </div>
          ) : null}
          {entry.affected_widgets && entry.affected_widgets.length > 0 ? (
            <div className="ai-tooluse-detail">
              <span className="ai-tooluse-detail-label">Widgets</span>
              <span>{entry.affected_widgets.join(', ')}</span>
            </div>
          ) : null}
          {entry.affected_paths && entry.affected_paths.length > 0 ? (
            <div className="ai-tooluse-detail">
              <span className="ai-tooluse-detail-label">Paths</span>
              <span>{entry.affected_paths.join(', ')}</span>
            </div>
          ) : null}
          {entry.tags && entry.tags.length > 0 ? (
            <div className="ai-message-tags">
              {entry.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
              {entry.approval_tier ? <span>{entry.approval_tier}</span> : null}
              {entry.approval_used ? <span>approval used</span> : null}
            </div>
          ) : null}
        </article>
      ))}
      <div ref={transcriptEndRef} />
    </section>
  )
}

function resolveStatusTone(entry: AgentFeedEntry) {
  if (entry.tone === 'error') {
    return 'error'
  }
  if (entry.tone === 'approval') {
    return 'approval'
  }
  if (entry.role === 'user') {
    return 'user'
  }
  return 'success'
}

function formatTimestamp(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
