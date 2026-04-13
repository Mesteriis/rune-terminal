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
        Ask about the active terminal, inspect your workspace, and keep the conversation beside your shell just like TideTerm’s AI panel flow.
      </p>
      <div className="ai-welcome-grid">
        <div>
          <span className="ai-welcome-icon"><i className="fa fa-plug" /></span>
          <div>
            <strong>Widget context</strong>
            <p>Turn it on to read the active terminal widget and use shell-aware quick actions.</p>
          </div>
        </div>
        <div>
          <span className="ai-welcome-icon"><i className="fa fa-paperclip" /></span>
          <div>
            <strong>Composer flow</strong>
            <p>The attach control follows TideTerm placement. File transport is still pending, so the control currently explains that gap.</p>
          </div>
        </div>
        <div>
          <span className="ai-welcome-icon"><i className="fa fa-keyboard" /></span>
          <div>
            <strong>Message flow</strong>
            <p><kbd>Enter</kbd> sends. <kbd>Shift</kbd> + <kbd>Enter</kbd> inserts a newline. Use <code>/run &lt;command&gt;</code> to execute in the active terminal and get a concise result summary back in the transcript.</p>
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
        <button className="ghost-button" onClick={() => onSelectSection('audit')}>
          Open audit
        </button>
      </div>
    </article>
  )
}
