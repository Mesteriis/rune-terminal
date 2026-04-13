import { AgentPanel } from './AgentPanel'
import { ApprovalBar } from './ApprovalBar'
import { AuditPanel } from './AuditPanel'
import { ExecutionNotice } from './ExecutionNotice'
import { PolicyPanel } from './PolicyPanel'
import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import { ToolConsolePanel } from './ToolConsolePanel'
import type {
  AgentCatalog,
  AuditEvent,
  ExecuteToolResponse,
  IgnoreRule,
  PendingApproval,
  RuntimeNotice,
  ToolInfo,
  TrustedRule,
  WorkspaceContextSummary,
} from '../types'

type AgentSidebarProps = {
  section: ShellSection
  onSelectSection: (section: ShellSection) => void
  catalog: AgentCatalog | null
  workspaceContext: WorkspaceContextSummary | null
  tools: ToolInfo[]
  lastResponse: ExecuteToolResponse | null
  notice: RuntimeNotice | null
  pendingApproval: PendingApproval | null
  isConfirmingApproval: boolean
  trustedRules: TrustedRule[]
  ignoreRules: IgnoreRule[]
  auditEvents: AuditEvent[]
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
  onExecuteTool: (request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onConfirmApproval: () => void | Promise<void>
  onDismissNotice: () => void
}

export function AgentSidebar({
  section,
  onSelectSection,
  catalog,
  workspaceContext,
  tools,
  lastResponse,
  notice,
  pendingApproval,
  isConfirmingApproval,
  trustedRules,
  ignoreRules,
  auditEvents,
  onSelectProfile,
  onSelectRole,
  onSelectMode,
  onExecuteTool,
  onConfirmApproval,
  onDismissNotice,
}: AgentSidebarProps) {
  return (
    <aside className="agent-shell">
      <div className="agent-shell-inner">
        <header className="agent-shell-header">
          <div className="agent-shell-heading">
            <p className="eyebrow">AI panel</p>
            <h2>Runa agent</h2>
            <span>{SHELL_SECTION_LABELS[section]} surface for the active workspace session.</span>
          </div>
          <nav className="agent-shell-tabs" aria-label="Agent panel sections">
            {(['agent', 'tools', 'policy', 'audit'] as ShellSection[]).map((entry) => (
              <button
                key={entry}
                className={entry === section ? 'agent-shell-tab active' : 'agent-shell-tab'}
                onClick={() => onSelectSection(entry)}
              >
                {SHELL_SECTION_LABELS[entry]}
              </button>
            ))}
          </nav>
        </header>

        {notice ? <ExecutionNotice notice={notice} onDismiss={onDismissNotice} /> : null}
        {pendingApproval ? (
          <ApprovalBar
            pendingApproval={pendingApproval}
            isConfirming={isConfirmingApproval}
            onConfirm={onConfirmApproval}
          />
        ) : null}

        <div className="agent-shell-scroll">
          {section === 'agent' ? (
            <AgentPanel
              catalog={catalog}
              workspaceContext={workspaceContext}
              onSelectProfile={onSelectProfile}
              onSelectRole={onSelectRole}
              onSelectMode={onSelectMode}
            />
          ) : null}
          {section === 'tools' ? (
            <ToolConsolePanel
              tools={tools}
              workspaceContext={workspaceContext}
              lastResponse={lastResponse}
              onExecuteTool={onExecuteTool}
            />
          ) : null}
          {section === 'policy' ? (
            <PolicyPanel trustedRules={trustedRules} ignoreRules={ignoreRules} onExecuteTool={onExecuteTool} />
          ) : null}
          {section === 'audit' ? <AuditPanel auditEvents={auditEvents} /> : null}
        </div>
      </div>
    </aside>
  )
}
