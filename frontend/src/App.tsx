import './App.css'
import { useState } from 'react'

import { AgentSidebar } from './components/AgentSidebar'
import { type ShellSection } from './components/ShellSections'
import { TerminalSurface } from './components/TerminalSurface'
import { WidgetDock } from './components/WidgetDock'
import { WorkspaceRail } from './components/WorkspaceRail'
import { useRuntimeShell } from './hooks/useRuntimeShell'

function App() {
  const shell = useRuntimeShell()
  const [section, setSection] = useState<ShellSection>('agent')

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
        activeWidgetId={shell.workspace?.active_widget_id}
        onFocusWidget={shell.focusWidget}
      />

      <section className="workspace-shell">
        <AgentSidebar
          section={section}
          onSelectSection={setSection}
          catalog={shell.agentCatalog}
          workspaceContext={shell.workspaceContext}
          tools={shell.tools}
          lastResponse={shell.lastResponse}
          notice={shell.notice}
          pendingApproval={shell.pendingApproval}
          isConfirmingApproval={shell.isConfirmingApproval}
          trustedRules={shell.trustedRules}
          ignoreRules={shell.ignoreRules}
          auditEvents={shell.auditEvents}
          onSelectProfile={(id) => shell.setActiveSelection('profile', id)}
          onSelectRole={(id) => shell.setActiveSelection('role', id)}
          onSelectMode={(id) => shell.setActiveSelection('mode', id)}
          onExecuteTool={shell.executeTool}
          onConfirmApproval={shell.confirmPendingRequest}
          onDismissNotice={shell.clearNotice}
        />

        <section className="workspace-stage">
          {shell.client && shell.activeWidget ? (
            <TerminalSurface
              client={shell.client}
              widgetId={shell.activeWidget.id}
              state={shell.terminalState}
              onInterrupt={shell.interruptWidget}
              onTerminalAction={() => shell.refreshTerminalState(shell.activeWidget?.id)}
            />
          ) : (
            <section className="terminal-card loading-panel">Connecting to runtime…</section>
          )}
        </section>

        <WidgetDock
          workspace={shell.workspace}
          activeWidget={shell.activeWidget}
          section={section}
          onSelectSection={setSection}
        />
      </section>
    </main>
  )
}

export default App
