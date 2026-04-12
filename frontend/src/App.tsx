import './App.css'
import { AgentPanel } from './components/AgentPanel'
import { ApprovalBar } from './components/ApprovalBar'
import { AuditPanel } from './components/AuditPanel'
import { PolicyPanel } from './components/PolicyPanel'
import { TerminalSurface } from './components/TerminalSurface'
import { ToolConsolePanel } from './components/ToolConsolePanel'
import { WorkspaceRail } from './components/WorkspaceRail'
import { useRuntimeShell } from './hooks/useRuntimeShell'

function App() {
  const shell = useRuntimeShell()

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
      <section className="hero-band">
        <div>
          <p className="eyebrow">RunaTerminal</p>
          <h1>Terminal workspace core with policy-first AI tooling.</h1>
          <p className="hero-copy">
            Tauri hosts the shell. Go owns the runtime. React stays thin. The tool console below
            executes against the same policy and audit pipeline the future AI layer will use.
          </p>
        </div>
        <dl className="hero-facts">
          <div>
            <dt>Repo root</dt>
            <dd>{shell.repoRoot || 'booting…'}</dd>
          </div>
          <div>
            <dt>Active widget</dt>
            <dd>{shell.activeWidget?.title ?? 'n/a'}</dd>
          </div>
        </dl>
      </section>

      <section className="board">
        <WorkspaceRail
          workspace={shell.workspace}
          activeWidgetId={shell.workspace?.active_widget_id}
          onFocusWidget={shell.focusWidget}
        />

        <section className="workspace-pane">
          {shell.client && shell.activeWidget ? (
            <TerminalSurface
              client={shell.client}
              widgetId={shell.activeWidget.id}
              state={shell.terminalState}
              onTerminalAction={() => shell.refreshTerminalState(shell.activeWidget?.id)}
            />
          ) : (
            <section className="terminal-card loading-panel">Connecting to runtime…</section>
          )}
        </section>

        <aside className="control-pane">
          <AgentPanel
            catalog={shell.agentCatalog}
            onSelectProfile={(id) => shell.setActiveSelection('profile', id)}
            onSelectRole={(id) => shell.setActiveSelection('role', id)}
            onSelectMode={(id) => shell.setActiveSelection('mode', id)}
          />
          <ToolConsolePanel activeWidgetId={shell.workspace?.active_widget_id} onExecuteTool={shell.executeTool} />
          <PolicyPanel
            trustedRules={shell.trustedRules}
            ignoreRules={shell.ignoreRules}
            onExecuteTool={shell.executeTool}
          />
          <AuditPanel auditEvents={shell.auditEvents} lastResponse={shell.lastResponse} />
        </aside>
      </section>

      {shell.pendingApproval ? (
        <ApprovalBar pendingApproval={shell.pendingApproval} onConfirm={shell.confirmPendingRequest} />
      ) : null}
    </main>
  )
}

export default App
