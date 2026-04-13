import './App.css'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { AgentSidebar } from './components/AgentSidebar'
import { TerminalSurface } from './components/TerminalSurface'
import { WidgetDock } from './components/WidgetDock'
import { WorkspaceRail } from './components/WorkspaceRail'
import { useRuntimeShell } from './hooks/useRuntimeShell'
import { useWorkspaceLayout } from './hooks/useWorkspaceLayout'

function App() {
  const shell = useRuntimeShell()
  const layout = useWorkspaceLayout()

  if (shell.runtimeError) {
    return (
      <main className="shell error-shell">
        <section className="error-panel">
          <p className="eyebrow">Runtime bootstrap failed</p>
          <h1>RunaTerminal cannot discover the Go core.</h1>
          <pre>{shell.runtimeError}</pre>
        </section>
      </main>
    )
  }

  return (
    <main className="shell">
      <WorkspaceRail
        workspace={shell.workspace}
        repoRoot={shell.repoRoot}
        activeTabId={shell.workspace?.active_tab_id}
        aiPanelVisible={layout.aiPanelVisible}
        onToggleAIPanel={layout.toggleAIPanel}
        onFocusTab={shell.focusTab}
        onCreateTab={() => shell.createTerminalTab()}
        onCloseTab={shell.closeTab}
        onMoveTab={shell.moveTab}
        onRenameTab={shell.renameTab}
        onToggleTabPinned={shell.setTabPinned}
      />

      <section className="workspace-shell">
        <Group
          orientation="horizontal"
          className="workspace-panel-group"
          onLayoutChanged={(nextLayout) => layout.rememberPanelSize(nextLayout['ai-panel'])}
        >
          {layout.aiPanelVisible ? (
            <>
              <Panel
                id="ai-panel"
                defaultSize={layout.aiPanelSize}
                minSize={20}
                maxSize={42}
                collapsible
                className="workspace-panel"
              >
                <AgentSidebar
                  section={layout.section}
                  onSelectSection={layout.selectSection}
                  policyView={layout.policyView}
                  onSelectPolicyView={layout.selectPolicyView}
                  catalog={shell.agentCatalog}
                  workspaceContext={shell.workspaceContext}
                  tools={shell.tools}
                  lastResponse={shell.lastResponse}
                  notice={shell.notice}
                  pendingApproval={shell.pendingApproval}
                  agentFeed={shell.agentFeed}
                  isConfirmingApproval={shell.isConfirmingApproval}
                  trustedRules={shell.trustedRules}
                  ignoreRules={shell.ignoreRules}
                  auditEvents={shell.auditEvents}
                  widgetContextEnabled={shell.widgetContextEnabled}
                  onSelectProfile={(id) => shell.setActiveSelection('profile', id)}
                  onSelectRole={(id) => shell.setActiveSelection('role', id)}
                  onSelectMode={(id) => shell.setActiveSelection('mode', id)}
                  onToggleWidgetContext={shell.toggleWidgetContext}
                  onExecuteTool={shell.executeTool}
                  onAddTrustedRule={shell.addTrustedRule}
                  onRemoveTrustedRule={shell.removeTrustedRule}
                  onAddIgnoreRule={shell.addIgnoreRule}
                  onRemoveIgnoreRule={shell.removeIgnoreRule}
                  onRunAgentAction={shell.runAgentAction}
                  onSubmitPrompt={shell.submitAgentPrompt}
                  onAttachClick={shell.reportAgentAttachmentUnavailable}
                  onConfirmApproval={shell.confirmPendingRequest}
                  onDismissNotice={shell.clearNotice}
                />
              </Panel>
              <Separator className="workspace-resize-handle" />
            </>
          ) : null}

          <Panel
            id="main-panel"
            defaultSize={layout.aiPanelVisible ? 100 - layout.aiPanelSize : 100}
            minSize={58}
            className="workspace-panel"
          >
            <section className="workspace-main">
              <section className="workspace-stage">
                {shell.client && shell.activeWidget ? (
                  <TerminalSurface
                    client={shell.client}
                    widgetId={shell.activeWidget.id}
                    state={shell.terminalState}
                    onInterrupt={shell.interruptWidget}
                    onTerminalAction={async () => {
                      await shell.refreshTerminalState(shell.activeWidget?.id)
                    }}
                  />
                ) : (
                  <section className="terminal-card loading-panel">Connecting to runtime…</section>
                )}
              </section>

              <WidgetDock
                workspace={shell.workspace}
                activeWidget={shell.activeWidget}
                onFocusWidget={shell.focusWidget}
                onCreateTerminalTab={() => shell.createTerminalTab()}
                section={layout.section}
                onSelectSection={layout.selectSection}
                onSelectPolicyView={layout.selectPolicyView}
              />
            </section>
          </Panel>
        </Group>
      </section>
    </main>
  )
}

export default App
