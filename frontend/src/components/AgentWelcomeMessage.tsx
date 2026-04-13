import type { AgentCatalog, WorkspaceContextSummary } from '../types'
import type { ShellSection } from './ShellSections'

type AgentWelcomeMessageProps = {
  catalog: AgentCatalog | null
  workspaceContext: WorkspaceContextSummary | null
  contextStatus: string
  onRunAgentAction: (label: string, request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onSelectSection: (section: ShellSection) => void
}

export function AgentWelcomeMessage({
  catalog,
  workspaceContext,
  contextStatus,
  onRunAgentAction,
  onSelectSection,
}: AgentWelcomeMessageProps) {
  return (
    <article className="ai-message-card ai-message-assistant ai-welcome-card">
      <header>
        <span className="ai-message-badge">RunaTerminal AI</span>
        <small>Runtime-backed assistant panel</small>
      </header>
      <strong>Terminal-first workflow stays in the center. AI stays at the side.</strong>
      <p>
        This panel follows the TideTerm AI shell pattern, but it is currently bound to the new Go runtime, policy
        engine, and audit trail rather than a full conversation backend.
      </p>
      <div className="ai-message-tags">
        <span>{catalog?.active.profile.name ?? 'Loading profile…'}</span>
        <span>{catalog?.active.role.name ?? 'Loading role…'}</span>
        <span>{catalog?.active.mode.name ?? 'Loading mode…'}</span>
        <span>{catalog?.active.effective_policy_profile.security_posture ?? 'balanced posture'}</span>
      </div>
      <div className="ai-message-tags">
        <span>{workspaceContext?.workspace_id ?? 'Loading workspace…'}</span>
        <span>{workspaceContext?.active_widget_id ?? 'No active widget'}</span>
        <span>{contextStatus}</span>
      </div>
      <div className="agent-quick-actions">
        <button className="ghost-button" onClick={() => void onRunAgentAction('Inspect terminal', { tool_name: 'term.get_state' })}>
          Inspect terminal
        </button>
        <button className="ghost-button" onClick={() => void onRunAgentAction('List tabs', { tool_name: 'workspace.list_tabs' })}>
          List tabs
        </button>
        <button className="ghost-button" onClick={() => onSelectSection('audit')}>
          Open audit
        </button>
      </div>
    </article>
  )
}
