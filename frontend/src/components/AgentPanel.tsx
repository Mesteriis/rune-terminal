import { AgentComposer } from './AgentComposer'
import { AgentModeStrip } from './AgentModeStrip'
import { AgentPanelStatus } from './AgentPanelStatus'
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

        <AgentPanelStatus
          notice={notice}
          pendingApproval={pendingApproval}
          isConfirmingApproval={isConfirmingApproval}
          onConfirmApproval={onConfirmApproval}
          onDismissNotice={onDismissNotice}
        />

        <AgentTranscript entries={agentFeed} />
      </div>

      <footer className="agent-composer">
        <AgentComposer onSubmitPrompt={onSubmitPrompt} onAttachClick={onAttachClick} />
        <div className="agent-panel-links">
          <button className="ghost-button compact-button" onClick={() => onSelectSection('tools')}>
            Operator tools
          </button>
          <button className="ghost-button compact-button" onClick={() => onSelectSection('policy')}>
            Settings
          </button>
          <button className="ghost-button compact-button" onClick={() => onSelectSection('audit')}>
            Audit
          </button>
        </div>
      </footer>
    </section>
  )
}
