import { AgentPanel } from './AgentPanel'
import { AgentHeaderMenuButton } from './AgentHeaderMenuButton'
import { AuditPanel } from './AuditPanel'
import { PolicyPanel } from './PolicyPanel'
import { SHELL_SECTION_LABELS, type ShellSection } from './ShellSections'
import { ToolConsolePanel } from './ToolConsolePanel'
import type {
  AgentCatalog,
  AgentFeedEntry,
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
  agentFeed: AgentFeedEntry[]
  isConfirmingApproval: boolean
  trustedRules: TrustedRule[]
  ignoreRules: IgnoreRule[]
  auditEvents: AuditEvent[]
  widgetContextEnabled: boolean
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
  onToggleWidgetContext: () => void
  onExecuteTool: (request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onRunAgentAction: (label: string, request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onSubmitPrompt: (prompt: string) => void | Promise<void>
  onAttachClick: () => void | Promise<void>
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
  agentFeed,
  isConfirmingApproval,
  trustedRules,
  ignoreRules,
  auditEvents,
  widgetContextEnabled,
  onSelectProfile,
  onSelectRole,
  onSelectMode,
  onToggleWidgetContext,
  onExecuteTool,
  onRunAgentAction,
  onSubmitPrompt,
  onAttachClick,
  onConfirmApproval,
  onDismissNotice,
}: AgentSidebarProps) {
  return (
    <aside className="agent-shell">
      <div className="agent-shell-inner">
        <header className="agent-shell-header">
          <div className="agent-shell-heading">
            <div className="agent-shell-title">
              <div>
                <p className="eyebrow">AI panel</p>
                <h2>RunaTerminal AI</h2>
              </div>
              <div className="agent-shell-controls">
                <button
                  className={widgetContextEnabled ? 'agent-context-toggle active' : 'agent-context-toggle'}
                  onClick={onToggleWidgetContext}
                  title={`Widget context ${widgetContextEnabled ? 'ON' : 'OFF'}`}
                >
                  <span className="agent-context-label">Widget Context</span>
                  <span className="agent-context-pill">{widgetContextEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <AgentHeaderMenuButton section={section} onSelectSection={onSelectSection} />
              </div>
            </div>
            <span>
              {widgetContextEnabled && workspaceContext?.active_widget_id
                ? `Attached to ${workspaceContext.active_widget_id} · ${SHELL_SECTION_LABELS[section]}`
                : `Agent panel is running without widget context · ${SHELL_SECTION_LABELS[section]}`}
            </span>
          </div>
        </header>

        <div className="agent-shell-scroll">
          {section === 'agent' ? (
              <AgentPanel
                catalog={catalog}
                workspaceContext={workspaceContext}
                notice={notice}
                pendingApproval={pendingApproval}
                agentFeed={agentFeed}
              isConfirmingApproval={isConfirmingApproval}
              onConfirmApproval={onConfirmApproval}
              onDismissNotice={onDismissNotice}
              onSelectProfile={onSelectProfile}
              onSelectRole={onSelectRole}
              onSelectMode={onSelectMode}
              onSelectSection={onSelectSection}
              onRunAgentAction={onRunAgentAction}
              onSubmitPrompt={onSubmitPrompt}
              onAttachClick={onAttachClick}
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

        {section !== 'agent' && notice ? (
          <footer className="agent-shell-footer">
            <div className={`inline-notice inline-notice-${notice.tone}`}>
              <strong>{notice.title}</strong>
              {notice.detail ? <span>{notice.detail}</span> : null}
              <button className="ghost-button" onClick={onDismissNotice}>
                Dismiss
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </aside>
  )
}
