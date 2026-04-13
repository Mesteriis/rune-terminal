import type { AgentCatalog, WorkspaceContextSummary } from '../types'

type AgentPanelProps = {
  catalog: AgentCatalog | null
  workspaceContext: WorkspaceContextSummary | null
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
}

export function AgentPanel({
  catalog,
  workspaceContext,
  onSelectProfile,
  onSelectRole,
  onSelectMode,
}: AgentPanelProps) {
  return (
    <section className="panel">
      <p className="eyebrow">Agent posture</p>
      <h2>Profile, role, and mode</h2>
      {catalog ? (
        <>
          <div className="stack-form">
            <label>
              Prompt profile
              <select value={catalog.active.profile.id} onChange={(event) => void onSelectProfile(event.target.value)}>
                {catalog.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role preset
              <select value={catalog.active.role.id} onChange={(event) => void onSelectRole(event.target.value)}>
                {catalog.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Work mode
              <select value={catalog.active.mode.id} onChange={(event) => void onSelectMode(event.target.value)}>
                {catalog.modes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="agent-current-strip">
            <span>{catalog.active.profile.name}</span>
            <span>{catalog.active.role.name}</span>
            <span>{catalog.active.mode.name}</span>
          </div>
          <dl className="agent-summary">
            <div>
              <dt>Security posture</dt>
              <dd>{catalog.active.effective_policy_profile.security_posture ?? 'balanced'}</dd>
            </div>
            <div>
              <dt>Minimum mutation tier</dt>
              <dd>{catalog.active.effective_policy_profile.approval_overlay?.minimum_mutation_tier ?? 'safe'}</dd>
            </div>
            <div>
              <dt>Trusted auto-approve</dt>
              <dd>{catalog.active.effective_policy_profile.disable_trusted_auto_approve ? 'disabled' : 'enabled'}</dd>
            </div>
            <div>
              <dt>Workspace context</dt>
              <dd>{workspaceContext?.workspace_id ?? 'loading'}</dd>
            </div>
            <div>
              <dt>Focused widget</dt>
              <dd>{workspaceContext?.active_widget_id ?? 'n/a'}</dd>
            </div>
          </dl>
          <details className="panel-details">
            <summary>Effective system prompt</summary>
            <pre>{catalog.active.effective_prompt}</pre>
          </details>
        </>
      ) : (
        <p>Loading agent catalog…</p>
      )}
    </section>
  )
}
