import type { Connection } from '../types'

export function connectionError(connection: Connection): string {
  return connection.runtime.launch_error || connection.runtime.check_error || ''
}

export function connectionCheckSummary(connection: Connection): string {
  switch (connection.runtime.check_status) {
    case 'passed':
      return formatStateWithTime('Checked on this machine', connection.runtime.last_checked_at)
    case 'failed':
      return formatStateWithTime('Preflight failed', connection.runtime.last_checked_at)
    default:
      return 'Not checked yet'
  }
}

export function connectionLaunchSummary(connection: Connection): string {
  switch (connection.runtime.launch_status) {
    case 'succeeded':
      return formatStateWithTime('Last shell launch succeeded', connection.runtime.last_launched_at)
    case 'failed':
      return formatStateWithTime('Last shell launch failed', connection.runtime.last_launched_at)
    default:
      return 'No shell launch recorded yet'
  }
}

export function connectionUsabilityCopy(connection: Connection): string {
  switch (connection.usability) {
    case 'available':
      return connection.kind === 'local' ? 'Ready' : 'Usable'
    case 'attention':
      return 'Needs attention'
    default:
      return connection.kind === 'local' ? 'Ready' : 'Not verified'
  }
}

function formatStateWithTime(prefix: string, timestamp?: string) {
  return timestamp ? `${prefix} · ${formatTimestamp(timestamp)}` : prefix
}

function formatTimestamp(timestamp: string) {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp
  }
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
