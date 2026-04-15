import { AgentPanel } from './AgentPanel'
import { AgentHeaderMenuButton } from './AgentHeaderMenuButton'
import { AuditPanel } from './AuditPanel'
import { ConnectionsPanel } from './ConnectionsPanel'
import { LauncherPanel } from './LauncherPanel'
import { PolicyPanel } from './PolicyPanel'
import type { PolicyView } from './PolicyViews'
import type { ShellSection } from './ShellSections'
import { ToolConsolePanel } from './ToolConsolePanel'
import type {
  AgentCatalog,
  AgentFeedEntry,
  AuditEvent,
  ConnectionCatalog,
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
  policyView: PolicyView
  onSelectPolicyView: (view: PolicyView) => void
  catalog: AgentCatalog | null
  workspaceContext: WorkspaceContextSummary | null
  workspace: import('../types').Workspace | null
  connections: ConnectionCatalog | null
  tools: ToolInfo[]
  lastResponse: ExecuteToolResponse | null
  notice: RuntimeNotice | null
  pendingApproval: PendingApproval | null
  agentFeed: AgentFeedEntry[]
  isSubmittingConversation: boolean
  isConfirmingApproval: boolean
  trustedRules: TrustedRule[]
  ignoreRules: IgnoreRule[]
  auditEvents: AuditEvent[]
  widgetContextEnabled: boolean
  onSelectProfile: (id: string) => void | Promise<void>
  onSelectRole: (id: string) => void | Promise<void>
  onSelectMode: (id: string) => void | Promise<void>
  onToggleWidgetContext: () => void
  onFocusWidget: (widget: import('../types').Widget) => void | Promise<void>
  onCreateTerminalTab: () => void | Promise<void>
  onCreateTerminalTabWithConnection: (connectionId: string, title?: string) => void | Promise<void>
  onSelectConnection: (connectionId: string) => void | Promise<void>
  onCheckConnection: (connectionId: string) => void | Promise<void>
  onSaveSSHConnection: (input: {
    name?: string
    host: string
    user?: string
    port?: number
    identity_file?: string
  }) => void | Promise<void>
  onExecuteTool: (request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onAddTrustedRule: (input: { scope: string; matcher: string; note?: string }) => void | Promise<unknown>
  onRemoveTrustedRule: (ruleId: string) => void | Promise<unknown>
  onAddIgnoreRule: (input: { pattern: string; mode: string; note?: string }) => void | Promise<unknown>
  onRemoveIgnoreRule: (ruleId: string) => void | Promise<unknown>
  onRunAgentAction: (label: string, request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
  onSubmitPrompt: (prompt: string) => void | Promise<void>
  onAttachClick: () => void | Promise<void>
  onConfirmApproval: () => void | Promise<void>
  onDismissNotice: () => void
}

export function AgentSidebar({
  section,
  onSelectSection,
  policyView,
  onSelectPolicyView,
  catalog,
  workspace,
  workspaceContext,
  connections,
  tools,
  lastResponse,
  notice,
  pendingApproval,
  agentFeed,
  isSubmittingConversation,
  isConfirmingApproval,
  trustedRules,
  ignoreRules,
  auditEvents,
  widgetContextEnabled,
  onSelectProfile,
  onSelectRole,
  onSelectMode,
  onToggleWidgetContext,
  onFocusWidget,
  onCreateTerminalTab,
  onCreateTerminalTabWithConnection,
  onSelectConnection,
  onCheckConnection,
  onSaveSSHConnection,
  onExecuteTool,
  onAddTrustedRule,
  onRemoveTrustedRule,
  onAddIgnoreRule,
  onRemoveIgnoreRule,
  onRunAgentAction,
  onSubmitPrompt,
  onAttachClick,
  onConfirmApproval,
  onDismissNotice,
}: AgentSidebarProps) {
  const shellHeading =
    section === 'agent'
      ? {
          eyebrow: 'AI panel',
          title: 'RunaTerminal AI',
          subtitle: widgetContextEnabled && workspaceContext?.active_widget_id
            ? `Attached to ${workspaceContext.active_widget_id}`
            : 'Agent panel is running without widget context',
        }
      : section === 'launcher'
        ? {
            eyebrow: 'Launcher',
            title: 'Open something',
            subtitle: 'Discover widgets, shell utilities, and help surfaces from one searchable catalog.',
          }
        : section === 'connections'
          ? {
              eyebrow: 'Connections',
              title: 'Connection targets',
              subtitle: 'Choose the default shell target or store a minimal SSH profile for new tabs.',
            }
        : section === 'tools'
          ? {
              eyebrow: 'Runtime',
              title: 'Runtime utilities',
              subtitle: 'Inspect tool metadata and execute internal runtime calls.',
            }
          : section === 'policy'
            ? {
                eyebrow: 'Settings',
                title: 'Shell settings',
                subtitle: 'Manage privacy, trust, and help surfaces without leaving the shell.',
              }
            : {
                eyebrow: 'Audit',
                title: 'Runtime trail',
                subtitle: 'Review recent operations, approvals, and policy outcomes.',
              }

  return (
    <aside className="agent-shell">
      <div className="agent-shell-inner">
        <header className="agent-shell-header">
          <div className="agent-shell-heading">
            <div className="agent-shell-title">
              <div>
                <p className="eyebrow">{shellHeading.eyebrow}</p>
                <h2>{shellHeading.title}</h2>
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
                <AgentHeaderMenuButton
                  section={section}
                  onSelectSection={onSelectSection}
                  onSelectPolicyView={onSelectPolicyView}
                />
              </div>
            </div>
            <span>{shellHeading.subtitle}</span>
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
                isSubmittingConversation={isSubmittingConversation}
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
          {section === 'launcher' ? (
            <LauncherPanel
              workspace={workspace}
              onCreateTerminalTab={onCreateTerminalTab}
              onFocusWidget={onFocusWidget}
              onSelectSection={onSelectSection}
            />
          ) : null}
          {section === 'connections' ? (
            <ConnectionsPanel
              catalog={connections}
              onSelectConnection={onSelectConnection}
              onCheckConnection={onCheckConnection}
              onCreateTerminalTabWithConnection={onCreateTerminalTabWithConnection}
              onSaveSSHConnection={onSaveSSHConnection}
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
            <PolicyPanel
              trustedRules={trustedRules}
              ignoreRules={ignoreRules}
              view={policyView}
              onSelectView={onSelectPolicyView}
              onSelectSection={onSelectSection}
              onAddTrustedRule={onAddTrustedRule}
              onRemoveTrustedRule={onRemoveTrustedRule}
              onAddIgnoreRule={onAddIgnoreRule}
              onRemoveIgnoreRule={onRemoveIgnoreRule}
            />
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
