import { AgentModeStrip } from './AgentModeStrip'
import type {
  AgentCatalog,
  ExecuteToolResponse,
  PendingApproval,
  RuntimeNotice,
  WorkspaceContextSummary,
} from '../types'
import type { ShellSection } from './ShellSections'

type AgentPanelProps = {
  catalog: AgentCatalog | null
  workspaceContext: WorkspaceContextSummary | null
  lastResponse: ExecuteToolResponse | null
  notice: RuntimeNotice | null
  pendingApproval: PendingApproval | null
  isConfirmingApproval: boolean
  onConfirmApproval: () => void | Promise<void>
  onDismissNotice: () => void
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
  onSelectSection: (section: ShellSection) => void
}

export function AgentPanel({
  catalog,
  workspaceContext,
  lastResponse,
  notice,
  pendingApproval,
  isConfirmingApproval,
  onConfirmApproval,
  onDismissNotice,
  onSelectProfile,
  onSelectRole,
  onSelectMode,
  onSelectSection,
}: AgentPanelProps) {
  const contextStatus = workspaceContext?.widget_context_enabled ? 'Widget context attached' : 'Widget context detached'

  return (
    <section className="agent-panel">
      <div className="agent-feed">
        <AgentModeStrip
          catalog={catalog}
          onSelectProfile={onSelectProfile}
          onSelectRole={onSelectRole}
          onSelectMode={onSelectMode}
        />

        <article className="ai-message-card ai-message-assistant">
          <header>
            <span className="ai-message-badge">RunaTerminal AI</span>
            <small>Panel shell derived from TideTerm</small>
          </header>
          <strong>Terminal-first workflow stays in the center. AI stays at the side.</strong>
          <p>
            This panel keeps the familiar TideTerm placement: active workspace in the main stage, AI and control flows
            in the side panel, runtime actions bound to the new Go core.
          </p>
        </article>

        <article className="ai-message-card ai-message-assistant">
          <header>
            <span className="ai-message-badge">Current posture</span>
            <small>{catalog ? catalog.active.mode.name : 'Loading mode…'}</small>
          </header>
          {catalog ? (
            <>
              <strong>
                {catalog.active.profile.name} / {catalog.active.role.name} / {catalog.active.mode.name}
              </strong>
              <p>
                Security posture: {catalog.active.effective_policy_profile.security_posture ?? 'balanced'}.
                Minimum mutation tier:{' '}
                {catalog.active.effective_policy_profile.approval_overlay?.minimum_mutation_tier ?? 'safe'}.
              </p>
              <div className="ai-message-tags">
                <span>{catalog.active.profile.id}</span>
                <span>{catalog.active.role.id}</span>
                <span>{catalog.active.mode.id}</span>
                <span>
                  {catalog.active.effective_policy_profile.disable_trusted_auto_approve
                    ? 'trusted auto-approve off'
                    : 'trusted auto-approve on'}
                </span>
              </div>
            </>
          ) : (
            <p>Loading agent catalog…</p>
          )}
        </article>

        <article className="ai-message-card ai-message-context">
          <header>
            <span className="ai-message-badge">Workspace context</span>
            <small>{contextStatus}</small>
          </header>
          <strong>{workspaceContext?.workspace_id ?? 'Loading workspace…'}</strong>
          <p>{workspaceContext?.repo_root ?? 'Discovering repository root…'}</p>
          <div className="ai-message-tags">
            <span>{workspaceContext?.active_widget_id ?? 'No active widget'}</span>
            <span>{contextStatus}</span>
          </div>
        </article>

        {notice ? (
          <article className={`ai-message-card ${notice.tone === 'error' ? 'ai-message-error' : 'ai-message-assistant'}`}>
            <header>
              <span className="ai-message-badge">{notice.tone === 'success' ? 'Completed' : 'Runtime notice'}</span>
              <button className="ghost-button compact-button" onClick={onDismissNotice}>
                Dismiss
              </button>
            </header>
            <strong>{notice.title}</strong>
            {notice.detail ? <p>{notice.detail}</p> : null}
          </article>
        ) : null}

        {pendingApproval ? (
          <article className="ai-message-card ai-message-approval">
            <header>
              <span className="ai-message-badge">Approval required</span>
              <small>{pendingApproval.approval_tier}</small>
            </header>
            <strong>{pendingApproval.tool_name}</strong>
            <p>{pendingApproval.summary}</p>
            <div className="button-row">
              <button onClick={() => void onConfirmApproval()} disabled={isConfirmingApproval}>
                {isConfirmingApproval ? 'Confirming…' : 'Confirm and continue'}
              </button>
              <button className="ghost-button" onClick={() => onSelectSection('audit')}>
                Review audit
              </button>
            </div>
          </article>
        ) : null}

        {lastResponse ? (
          <article className="ai-message-card ai-message-assistant">
            <header>
              <span className="ai-message-badge">Latest runtime action</span>
              <small>{lastResponse.status}</small>
            </header>
            <strong>{lastResponse.operation?.summary ?? 'Runtime response captured'}</strong>
            <p>
              {lastResponse.tool?.name
                ? `Tool: ${lastResponse.tool.name}`
                : lastResponse.error ?? 'The runtime returned a payload.'}
            </p>
            <details className="panel-details">
              <summary>Inspect payload</summary>
              <pre>{JSON.stringify(lastResponse, null, 2)}</pre>
            </details>
          </article>
        ) : null}
      </div>

      <footer className="agent-composer">
        <div className="agent-composer-actions">
          <button className="ghost-button" onClick={() => onSelectSection('tools')}>
            Open tools
          </button>
          <button className="ghost-button" onClick={() => onSelectSection('policy')}>
            Open settings
          </button>
          <button className="ghost-button" onClick={() => onSelectSection('audit')}>
            Open audit
          </button>
        </div>
      </footer>
    </section>
  )
}
