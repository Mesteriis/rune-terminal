import type { Connection } from '../types'
import {
  connectionCheckSummary,
  connectionError,
  connectionLaunchSummary,
  connectionUsabilityCopy,
} from '../lib/connections'

type ConnectionCardProps = {
  connection: Connection
  onSelectConnection: (connectionId: string) => void | Promise<void>
  onCreateTerminalTabWithConnection: (connectionId: string, title?: string) => void | Promise<void>
  onCheckConnection: (connectionId: string) => void | Promise<void>
}

export function ConnectionCard({
  connection,
  onSelectConnection,
  onCreateTerminalTabWithConnection,
  onCheckConnection,
}: ConnectionCardProps) {
  const error = connectionError(connection)

  return (
    <div className={`connections-card ${connection.active ? 'active' : ''} usability-${connection.usability}`}>
      <div className="connections-card-header">
        <div className="connections-card-main">
          <strong>{connection.name}</strong>
          <span>{connection.description || (connection.kind === 'local' ? 'Local machine' : 'SSH connection')}</span>
        </div>
        <div className="connections-card-meta">
          {connection.active ? <span className="status-pill status-default">default</span> : null}
          <span className={`status-pill status-${connection.status}`}>{connection.status}</span>
          <span className={`status-pill usability-pill usability-${connection.usability}`}>{connectionUsabilityCopy(connection)}</span>
          <span className="status-pill">{connection.kind}</span>
        </div>
      </div>

      <div className="connections-status-grid">
        <div>
          <span>Check</span>
          <strong>{connectionCheckSummary(connection)}</strong>
        </div>
        <div>
          <span>Launch</span>
          <strong>{connectionLaunchSummary(connection)}</strong>
        </div>
      </div>

      {error ? <div className="connections-error-banner">{error}</div> : null}

      <div className="connections-card-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={() => void onSelectConnection(connection.id)}
          disabled={connection.active}
        >
          {connection.active ? 'Default target' : 'Use for new tabs'}
        </button>
        <button type="button" className="ghost-button" onClick={() => void onCheckConnection(connection.id)}>
          Check
        </button>
        <button type="button" onClick={() => void onCreateTerminalTabWithConnection(connection.id, connection.name)}>
          Open shell
        </button>
      </div>
    </div>
  )
}
