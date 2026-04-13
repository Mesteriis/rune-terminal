import type { Connection } from '../types'

export function connectionError(connection: Connection): string {
  return connection.runtime.launch_error || connection.runtime.check_error || ''
}

export function connectionLifecycleNote(connection: Connection): { tone: 'success' | 'warning' | 'error'; text: string } | null {
  if (connection.runtime.launch_status === 'failed' && connection.runtime.launch_error) {
    return { tone: 'error', text: connection.runtime.launch_error }
  }
  if (connection.runtime.check_status === 'failed' && connection.runtime.launch_status === 'succeeded') {
    return {
      tone: 'warning',
      text: `${connection.runtime.check_error || 'Preflight reported an issue.'} The last shell launch still succeeded using the current SSH environment.`,
    }
  }
  if (connection.runtime.check_status === 'failed' && connection.runtime.check_error) {
    return { tone: 'warning', text: connection.runtime.check_error }
  }
  if (connection.runtime.launch_status === 'succeeded') {
    return { tone: 'success', text: 'Last shell launch succeeded and this target is ready for new tabs.' }
  }
  return null
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

export function connectionTargetSummary(connection: Connection): string {
  if (connection.kind === 'local') {
    return 'Local machine'
  }
  if (!connection.ssh) {
    return 'SSH target is not configured'
  }
  const host = connection.ssh.host
  const user = connection.ssh.user ? `${connection.ssh.user}@` : ''
  const port = connection.ssh.port ? `:${connection.ssh.port}` : ''
  return `${user}${host}${port}`
}

export function connectionAuthSummary(connection: Connection): string {
  if (connection.kind === 'local') {
    return 'Uses the local shell environment'
  }
  if (connection.ssh?.identity_file) {
    return `Key auth via ${connection.ssh.identity_file}`
  }
  return 'Uses system SSH defaults (noninteractive only)'
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
