import type { AuditEvent, ExecuteToolResponse } from '../types'

type AuditPanelProps = {
  auditEvents: AuditEvent[]
  lastResponse: ExecuteToolResponse | null
}

export function AuditPanel({ auditEvents, lastResponse }: AuditPanelProps) {
  const events = auditEvents ?? []

  return (
    <>
      <section className="panel">
        <p className="eyebrow">Audit</p>
        <ul className="audit-list">
          {events.map((event) => (
            <li key={event.id} className={event.success ? 'audit-ok' : 'audit-fail'}>
              <strong>{event.tool_name}</strong>
              <span>{event.summary ?? event.error ?? 'event recorded'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel response-panel">
        <p className="eyebrow">Last tool response</p>
        <pre>{lastResponse ? JSON.stringify(lastResponse, null, 2) : 'No tool activity yet.'}</pre>
      </section>
    </>
  )
}
