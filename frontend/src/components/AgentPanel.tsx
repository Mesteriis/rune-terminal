import { AgentComposer } from './AgentComposer'
import { AgentModeStrip } from './AgentModeStrip'
import { AgentTranscript } from './AgentTranscript'
import { AgentWelcomeMessage } from './AgentWelcomeMessage'
import type {
  AgentCatalog,
  AgentFeedEntry,
  PendingApproval,
  RuntimeNotice,
  WorkspaceContextSummary,
} from '../types'
import type { ShellSection } from './ShellSections'

type AgentPanelProps = {
  catalog: AgentCatalog | null
  workspaceContext: WorkspaceContextSummary | null
  notice: RuntimeNotice | null
  pendingApproval: PendingApproval | null
  agentFeed: AgentFeedEntry[]
  isConfirmingApproval: boolean
  onConfirmApproval: () => void | Promise<void>
  onDismissNotice: () => void
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
  onSelectSection: (section: ShellSection) => void
  onRunAgentAction: (label: string, request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onSubmitPrompt: (prompt: string) => void | Promise<void>
  onAttachClick: () => void | Promise<void>
}

export function AgentPanel({
  catalog,
  workspaceContext,
  notice,
  pendingApproval,
  agentFeed,
  isConfirmingApproval,
  onConfirmApproval,
  onDismissNotice,
  onSelectProfile,
  onSelectRole,
  onSelectMode,
  onSelectSection,
  onRunAgentAction,
  onSubmitPrompt,
  onAttachClick,
}: AgentPanelProps) {
  const contextStatus = workspaceContext?.widget_context_enabled ? 'Widget context attached' : 'Widget context detached'
  const hasFeed = agentFeed.length > 0

  return (
    <section className="agent-panel">
      <div className="agent-feed">
        <AgentModeStrip
          catalog={catalog}
          onSelectProfile={onSelectProfile}
          onSelectRole={onSelectRole}
          onSelectMode={onSelectMode}
        />

        {!hasFeed ? (
          <AgentWelcomeMessage
            catalog={catalog}
            workspaceContext={workspaceContext}
            contextStatus={contextStatus}
            onRunAgentAction={onRunAgentAction}
            onSelectSection={onSelectSection}
          />
        ) : null}

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

        <AgentTranscript entries={agentFeed} />
      </div>

      <footer className="agent-composer">
        <AgentComposer onSubmitPrompt={onSubmitPrompt} onAttachClick={onAttachClick} />
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
