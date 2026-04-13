import { AuditEventCard } from './AuditEventCard'
import type { AuditEvent } from '../types'

type AuditPanelProps = {
  auditEvents: AuditEvent[]
}

export function AuditPanel({ auditEvents }: AuditPanelProps) {
  const events = auditEvents ?? []
  const approvalsUsed = events.filter((event) => event.approval_used).length

  return (
    <section className="panel audit-panel">
      <div className="audit-panel-header">
        <p className="eyebrow">Audit</p>
        <h2>Runtime trail</h2>
        <span>
          Recent shell operations, approval outcomes, and policy decisions. {approvalsUsed} approval-backed action
          {approvalsUsed === 1 ? '' : 's'} in the current tail.
        </span>
      </div>

      <ul className="audit-list">
        {events.length === 0 ? <li className="audit-empty">No audit events recorded yet.</li> : null}
        {events.map((event) => (
          <AuditEventCard key={event.id} event={event} />
        ))}
      </ul>
    </section>
  )
}
