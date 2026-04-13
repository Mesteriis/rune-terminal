import { useMemo, useState } from 'react'

import type { ConnectionCatalog } from '../types'

type ConnectionsPanelProps = {
  catalog: ConnectionCatalog | null
  onSelectConnection: (connectionId: string) => void | Promise<void>
  onCreateTerminalTabWithConnection: (connectionId: string, title?: string) => void | Promise<void>
  onSaveSSHConnection: (input: {
    name?: string
    host: string
    user?: string
    port?: number
    identity_file?: string
  }) => void | Promise<void>
}

export function ConnectionsPanel({
  catalog,
  onSelectConnection,
  onCreateTerminalTabWithConnection,
  onSaveSSHConnection,
}: ConnectionsPanelProps) {
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [user, setUser] = useState('')
  const [port, setPort] = useState('')
  const [identityFile, setIdentityFile] = useState('')

  const activeConnection = useMemo(() => {
    if (!catalog) {
      return null
    }
    return catalog.connections.find((connection) => connection.id === catalog.active_connection_id) ?? null
  }, [catalog])

  return (
    <section className="panel connections-panel">
      <div className="launcher-panel-header">
        <p className="eyebrow">Connections</p>
        <h2>Choose where shells start</h2>
        <span>RunaTerminal now distinguishes local shells from SSH-backed shells. Select the default target or add a minimal SSH profile for new tabs.</span>
      </div>

      <div className="connections-active-card">
        <span>Active target</span>
        <strong>{activeConnection?.name ?? 'Local Machine'}</strong>
        <small>{activeConnection?.description ?? 'Local shell sessions launched through the Go runtime'}</small>
      </div>

      <div className="connections-list">
        {(catalog?.connections ?? []).map((connection) => (
          <div key={connection.id} className={`connections-card ${connection.active ? 'active' : ''}`}>
            <div className="connections-card-main">
              <strong>{connection.name}</strong>
              <span>{connection.description || (connection.kind === 'local' ? 'Local machine' : 'SSH connection')}</span>
            </div>
            <div className="connections-card-meta">
              <span className={`status-pill status-${connection.status}`}>{connection.status}</span>
              <span className="status-pill">{connection.kind}</span>
            </div>
            <div className="connections-card-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => void onSelectConnection(connection.id)}
                disabled={connection.active}
              >
                {connection.active ? 'Selected' : 'Use for new tabs'}
              </button>
              <button type="button" onClick={() => void onCreateTerminalTabWithConnection(connection.id, connection.name)}>
                Open shell
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        className="connections-form"
        onSubmit={(event) => {
          event.preventDefault()
          const parsedPort = port.trim() ? Number(port) : undefined
          void onSaveSSHConnection({
            name: name.trim() || undefined,
            host: host.trim(),
            user: user.trim() || undefined,
            port: Number.isFinite(parsedPort) ? parsedPort : undefined,
            identity_file: identityFile.trim() || undefined,
          })
          setName('')
          setHost('')
          setUser('')
          setPort('')
          setIdentityFile('')
        }}
      >
        <div className="connections-form-header">
          <strong>Add SSH connection</strong>
          <span>This foundation slice stores a reusable SSH profile and launches remote shells through the system `ssh` binary. It does not implement the old TideTerm connserver stack yet.</span>
        </div>
        <div className="connections-form-grid">
          <label>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Prod box" />
          </label>
          <label>
            <span>Host</span>
            <input value={host} onChange={(event) => setHost(event.target.value)} placeholder="prod.example.com" required />
          </label>
          <label>
            <span>User</span>
            <input value={user} onChange={(event) => setUser(event.target.value)} placeholder="deploy" />
          </label>
          <label>
            <span>Port</span>
            <input value={port} onChange={(event) => setPort(event.target.value)} placeholder="22" inputMode="numeric" />
          </label>
          <label className="connections-form-wide">
            <span>Identity file</span>
            <input
              value={identityFile}
              onChange={(event) => setIdentityFile(event.target.value)}
              placeholder="~/.ssh/id_ed25519"
            />
          </label>
        </div>
        <div className="connections-form-actions">
          <button type="submit">Save SSH profile</button>
        </div>
      </form>
    </section>
  )
}
