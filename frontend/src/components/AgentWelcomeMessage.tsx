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
        <small>Terminal-aware assistant</small>
      </header>
      <strong>Welcome to RunaTerminal AI</strong>
      <p>
        The panel follows the TideTerm AI shell pattern: terminal work stays in the center, while chat, approvals,
        and operator surfaces stay at the side.
      </p>
      <div className="ai-welcome-grid">
        <div>
          <span className="ai-welcome-icon"><i className="fa fa-plug" /></span>
          <div>
            <strong>Widget context</strong>
            <p>When enabled, the assistant reads the active terminal widget and can act on it.</p>
          </div>
        </div>
        <div>
          <span className="ai-welcome-icon"><i className="fa fa-paperclip" /></span>
          <div>
            <strong>Composer flow</strong>
            <p>The TideTerm-style attach control is visible here; attachment transport still needs a dedicated backend path.</p>
          </div>
        </div>
        <div>
          <span className="ai-welcome-icon"><i className="fa fa-keyboard" /></span>
          <div>
            <strong>Input shortcuts</strong>
            <p><kbd>Enter</kbd> sends. <kbd>Shift</kbd> + <kbd>Enter</kbd> inserts a newline.</p>
          </div>
        </div>
      </div>
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
        <button className="ghost-button" onClick={() => void onRunAgentAction('List widgets', { tool_name: 'workspace.list_widgets' })}>
          List widgets
        </button>
        <button className="ghost-button" onClick={() => onSelectSection('policy')}>
          Open settings
        </button>
      </div>
    </article>
  )
}
