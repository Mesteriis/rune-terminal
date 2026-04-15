import type { AuditEvent } from '../types'

type AuditEventCardProps = {
  event: AuditEvent
}

export function AuditEventCard({ event }: AuditEventCardProps) {
  return (
    <li className={`audit-event ${event.success ? 'audit-ok' : 'audit-fail'}`}>
      <div className="audit-topline">
        <strong>{event.tool_name}</strong>
        <span>{formatTimestamp(event.timestamp)}</span>
      </div>

      <span>{event.summary ?? event.error ?? 'Event recorded'}</span>

      {event.affected_widgets?.length ? (
        <div className="audit-secondary-list">
          <strong>Widgets</strong>
          <span>{event.affected_widgets.join(', ')}</span>
        </div>
      ) : null}

      {event.affected_paths?.length ? (
        <div className="audit-secondary-list">
          <strong>Paths</strong>
          <span>{event.affected_paths.join(', ')}</span>
        </div>
      ) : null}

      <div className="audit-tags">
        <span>{event.success ? 'success' : 'failed'}</span>
        <span>{event.role_id ?? 'no-role'}</span>
        <span>{event.mode_id ?? 'no-mode'}</span>
        <span>{event.approval_used ? 'approval used' : 'no approval'}</span>
      </div>
    </li>
  )
}

function formatTimestamp(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
