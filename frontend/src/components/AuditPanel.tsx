import type { AuditEvent } from '../types'

type AuditPanelProps = {
  auditEvents: AuditEvent[]
}

export function AuditPanel({ auditEvents }: AuditPanelProps) {
  const events = auditEvents ?? []

  return (
    <section className="panel">
      <p className="eyebrow">Audit tail</p>
      <h2>Recent runtime operations</h2>
      <ul className="audit-list">
        {events.length === 0 ? <li className="audit-empty">No audit events recorded yet.</li> : null}
        {events.map((event) => (
          <li key={event.id} className={`audit-event ${event.success ? 'audit-ok' : 'audit-fail'}`}>
            <div className="audit-topline">
              <strong>{event.tool_name}</strong>
              <span>{formatTimestamp(event.timestamp)}</span>
            </div>
            <span>{event.summary ?? event.error ?? 'event recorded'}</span>
            <div className="audit-tags">
              <span>{event.success ? 'success' : 'failed'}</span>
              <span>{event.role_id ?? 'no-role'}</span>
              <span>{event.mode_id ?? 'no-mode'}</span>
              <span>{event.approval_used ? 'approval used' : 'no approval'}</span>
            </div>
          </li>
        ))}
      </ul>
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
