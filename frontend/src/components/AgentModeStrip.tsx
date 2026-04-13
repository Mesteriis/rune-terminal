import type { AgentCatalog } from '../types'

type AgentModeStripProps = {
  catalog: AgentCatalog | null
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
}

export function AgentModeStrip({ catalog, onSelectProfile, onSelectRole, onSelectMode }: AgentModeStripProps) {
  return (
    <section className="agent-mode-strip">
      <div className="agent-mode-strip-copy">
        <strong>{catalog?.active.mode.name ?? 'Mode'}</strong>
        <span>{catalog?.active.profile.name ?? 'Profile'} · {catalog?.active.role.name ?? 'Role'}</span>
      </div>
      <div className="agent-mode-strip-controls">
        <label className="agent-mode-select mode">
          <span>Mode</span>
          <select value={catalog?.active.mode.id ?? ''} onChange={(event) => void onSelectMode(event.target.value)} disabled={!catalog}>
            {(catalog?.modes ?? []).map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </select>
        </label>
        <label className="agent-mode-select">
          <span>Profile</span>
          <select value={catalog?.active.profile.id ?? ''} onChange={(event) => void onSelectProfile(event.target.value)} disabled={!catalog}>
            {(catalog?.profiles ?? []).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label className="agent-mode-select">
          <span>Role</span>
          <select value={catalog?.active.role.id ?? ''} onChange={(event) => void onSelectRole(event.target.value)} disabled={!catalog}>
            {(catalog?.roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
