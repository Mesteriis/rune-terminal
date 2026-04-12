import { useEffect, useMemo, useState } from 'react'

import './App.css'
import { TerminalSurface } from './components/TerminalSurface'
import { RtermClient } from './lib/api'
import { resolveRuntimeInfo } from './lib/runtime'
import type {
  ApprovalGrant,
  AuditEvent,
  BootstrapPayload,
  ExecuteToolRequest,
  ExecuteToolResponse,
  IgnoreRule,
  PendingApproval,
  TerminalState,
  TrustedRule,
  Widget,
  Workspace,
} from './types'

function App() {
  const [client, setClient] = useState<RtermClient | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [repoRoot, setRepoRoot] = useState('')
  const [terminalState, setTerminalState] = useState<TerminalState | null>(null)
  const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([])
  const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [lastResponse, setLastResponse] = useState<ExecuteToolResponse | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [pendingRequest, setPendingRequest] = useState<ExecuteToolRequest | null>(null)
  const [toolCommand, setToolCommand] = useState('pwd')
  const [trustedMatcher, setTrustedMatcher] = useState('term.send_input')
  const [trustedScope, setTrustedScope] = useState('repo')
  const [ignorePattern, setIgnorePattern] = useState('.env*')
  const [ignoreMode, setIgnoreMode] = useState('metadata-only')

  useEffect(() => {
    async function boot() {
      try {
        const runtime = await resolveRuntimeInfo()
        const nextClient = new RtermClient(runtime)
        setClient(nextClient)
        const payload = await nextClient.bootstrap()
        applyBootstrap(payload)
        const audit = await nextClient.audit()
        setAuditEvents(audit.events)
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : String(error))
      }
    }
    void boot()
  }, [])

  const activeWidget = useMemo(() => {
    return workspace?.widgets.find((widget) => widget.id === workspace.active_widget_id) ?? null
  }, [workspace])

  useEffect(() => {
    if (!client || !workspace) {
      return
    }
    const nextClient = client
    const nextWorkspace = workspace

    async function syncActiveView() {
      const widgetId = nextWorkspace.active_widget_id
      const context = {
        workspace_id: nextWorkspace.id,
        repo_root: repoRoot,
        active_widget_id: nextWorkspace.active_widget_id,
      }

      const terminal = await nextClient.executeTool({
        tool_name: 'term.get_state',
        input: { widget_id: widgetId },
        context,
      })
      setLastResponse(terminal)
      if (terminal.status === 'ok') {
        setTerminalState(terminal.output as TerminalState)
      }

      const trusted = await nextClient.executeTool({
        tool_name: 'safety.list_trusted_rules',
        context,
      })
      const ignore = await nextClient.executeTool({
        tool_name: 'safety.list_ignore_rules',
        context,
      })
      if (trusted.status === 'ok') {
        setTrustedRules(((trusted.output as { rules?: TrustedRule[] })?.rules ?? []) as TrustedRule[])
      }
      if (ignore.status === 'ok') {
        setIgnoreRules(((ignore.output as { rules?: IgnoreRule[] })?.rules ?? []) as IgnoreRule[])
      }
    }

    void syncActiveView()
  }, [client, repoRoot, workspace])

  function applyBootstrap(payload: BootstrapPayload) {
    setWorkspace(payload.workspace)
    setRepoRoot(payload.repo_root)
  }

  async function refreshWorkspace() {
    if (!client) {
      return
    }
    const nextWorkspace = await client.workspace()
    setWorkspace(nextWorkspace)
  }

  async function refreshAudit() {
    if (!client) {
      return
    }
    const audit = await client.audit()
    setAuditEvents(audit.events)
  }

  async function refreshTerminalState(widgetId = workspace?.active_widget_id) {
    if (!client || !widgetId || !workspace) {
      return
    }
    const response = await client.executeTool({
      tool_name: 'term.get_state',
      input: { widget_id: widgetId },
      context: {
        workspace_id: workspace.id,
        repo_root: repoRoot,
        active_widget_id: workspace.active_widget_id,
      },
    })
    setLastResponse(response)
    if (response.status === 'ok') {
      setTerminalState(response.output as TerminalState)
    }
  }

  async function refreshPolicyLists() {
    if (!client || !workspace) {
      return
    }
    const trusted = await client.executeTool({
      tool_name: 'safety.list_trusted_rules',
      context: {
        workspace_id: workspace.id,
        repo_root: repoRoot,
        active_widget_id: workspace.active_widget_id,
      },
    })
    const ignore = await client.executeTool({
      tool_name: 'safety.list_ignore_rules',
      context: {
        workspace_id: workspace.id,
        repo_root: repoRoot,
        active_widget_id: workspace.active_widget_id,
      },
    })
    if (trusted.status === 'ok') {
      setTrustedRules(((trusted.output as { rules?: TrustedRule[] })?.rules ?? []) as TrustedRule[])
    }
    if (ignore.status === 'ok') {
      setIgnoreRules(((ignore.output as { rules?: IgnoreRule[] })?.rules ?? []) as IgnoreRule[])
    }
  }

  async function executeTool(request: ExecuteToolRequest) {
    if (!client || !workspace) {
      return
    }
    const response = await client.executeTool({
      ...request,
      context: {
        workspace_id: workspace.id,
        repo_root: repoRoot,
        active_widget_id: workspace.active_widget_id,
      },
    })
    setLastResponse(response)

    if (response.status === 'requires_confirmation' && response.pending_approval) {
      setPendingApproval(response.pending_approval)
      setPendingRequest(request)
      return
    }

    setPendingApproval(null)
    setPendingRequest(null)
    await refreshWorkspace()
    await refreshAudit()
    await refreshPolicyLists()
    if (request.tool_name.startsWith('term.') || request.tool_name.startsWith('workspace.')) {
      await refreshTerminalState(
        (request.input as { widget_id?: string } | undefined)?.widget_id ?? workspace.active_widget_id,
      )
    }
  }

  async function confirmPendingRequest() {
    if (!client || !workspace || !pendingApproval || !pendingRequest) {
      return
    }
    const confirmation = await client.executeTool({
      tool_name: 'safety.confirm',
      input: { approval_id: pendingApproval.id },
      context: {
        workspace_id: workspace.id,
        repo_root: repoRoot,
        active_widget_id: workspace.active_widget_id,
      },
    })
    setLastResponse(confirmation)
    if (confirmation.status !== 'ok') {
      return
    }
    const grant = confirmation.output as ApprovalGrant
    await executeTool({ ...pendingRequest, approval_token: grant.approval_token })
  }

  async function focusWidget(widget: Widget) {
    await executeTool({
      tool_name: 'workspace.focus_widget',
      input: { widget_id: widget.id },
    })
  }

  if (runtimeError) {
    return (
      <main className="shell error-shell">
        <section className="error-panel">
          <p className="eyebrow">Runtime bootstrap failed</p>
          <h1>RunaTerminal cannot discover the Go core.</h1>
          <pre>{runtimeError}</pre>
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
            <dd>{repoRoot || 'booting…'}</dd>
          </div>
          <div>
            <dt>Active widget</dt>
            <dd>{activeWidget?.title ?? 'n/a'}</dd>
          </div>
        </dl>
      </section>

      <section className="board">
        <aside className="widget-rail">
          <header>
            <p className="eyebrow">Workspace</p>
            <h2>{workspace?.name ?? 'Booting workspace…'}</h2>
          </header>
          <div className="widget-list">
            {workspace?.widgets.map((widget) => (
              <button
                key={widget.id}
                className={widget.id === workspace.active_widget_id ? 'widget-pill active' : 'widget-pill'}
                onClick={() => void focusWidget(widget)}
              >
                <strong>{widget.title}</strong>
                <span>{widget.description ?? widget.kind}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="workspace-pane">
          {client && activeWidget ? (
            <TerminalSurface
              client={client}
              widgetId={activeWidget.id}
              state={terminalState}
              onTerminalAction={() => refreshTerminalState(activeWidget.id)}
            />
          ) : (
            <section className="terminal-card loading-panel">Connecting to runtime…</section>
          )}
        </section>

        <aside className="control-pane">
          <section className="panel">
            <p className="eyebrow">Tool console</p>
            <h2>AI-native runtime slice</h2>
            <div className="button-row">
              <button onClick={() => void executeTool({ tool_name: 'workspace.list_widgets' })}>List widgets</button>
              <button onClick={() => void executeTool({ tool_name: 'workspace.get_active_widget' })}>
                Active widget
              </button>
              <button
                onClick={() =>
                  activeWidget &&
                  void executeTool({
                    tool_name: 'term.get_state',
                    input: { widget_id: activeWidget.id },
                  })
                }
              >
                Terminal state
              </button>
            </div>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault()
                void executeTool({
                  tool_name: 'term.send_input',
                  input: {
                    widget_id: workspace?.active_widget_id,
                    text: toolCommand,
                    append_newline: true,
                  },
                })
              }}
            >
              <label>
                `term.send_input`
                <input value={toolCommand} onChange={(event) => setToolCommand(event.target.value)} />
              </label>
              <button type="submit">Run tool</button>
            </form>
          </section>

          <section className="panel">
            <p className="eyebrow">Trusted rules</p>
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault()
                void executeTool({
                  tool_name: 'safety.add_trusted_rule',
                  input: {
                    scope: trustedScope,
                    subject_type: 'tool',
                    matcher_type: 'exact',
                    matcher: trustedMatcher,
                    note: 'MVP policy console',
                  },
                })
              }}
            >
              <label>
                Scope
                <select value={trustedScope} onChange={(event) => setTrustedScope(event.target.value)}>
                  <option value="global">global</option>
                  <option value="workspace">workspace</option>
                  <option value="repo">repo</option>
                </select>
              </label>
              <label>
                Tool matcher
                <input value={trustedMatcher} onChange={(event) => setTrustedMatcher(event.target.value)} />
              </label>
              <button type="submit">Add trusted rule</button>
            </form>

            <ul className="rule-list">
              {trustedRules.map((rule) => (
                <li key={rule.id}>
                  <code>{rule.matcher ?? 'structured'}</code>
                  <span>{rule.scope}</span>
                  <button
                    onClick={() =>
                      void executeTool({
                        tool_name: 'safety.remove_trusted_rule',
                        input: { rule_id: rule.id },
                      })
                    }
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <p className="eyebrow">Ignore rules</p>
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault()
                void executeTool({
                  tool_name: 'safety.add_ignore_rule',
                  input: {
                    scope: 'repo',
                    matcher_type: 'glob',
                    pattern: ignorePattern,
                    mode: ignoreMode,
                    note: 'MVP secret shield',
                  },
                })
              }}
            >
              <label>
                Pattern
                <input value={ignorePattern} onChange={(event) => setIgnorePattern(event.target.value)} />
              </label>
              <label>
                Mode
                <select value={ignoreMode} onChange={(event) => setIgnoreMode(event.target.value)}>
                  <option value="deny">deny</option>
                  <option value="metadata-only">metadata-only</option>
                  <option value="redact">redact</option>
                </select>
              </label>
              <button type="submit">Add ignore rule</button>
            </form>

            <ul className="rule-list">
              {ignoreRules.map((rule) => (
                <li key={rule.id}>
                  <code>{rule.pattern}</code>
                  <span>{rule.mode}</span>
                  <button
                    onClick={() =>
                      void executeTool({
                        tool_name: 'safety.remove_ignore_rule',
                        input: { rule_id: rule.id },
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <p className="eyebrow">Audit</p>
            <ul className="audit-list">
              {auditEvents.map((event) => (
                <li key={event.id} className={event.success ? 'audit-ok' : 'audit-fail'}>
                  <strong>{event.tool_name}</strong>
                  <span>{event.summary ?? event.error ?? 'event recorded'}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel response-panel">
            <p className="eyebrow">Last tool response</p>
            <pre>{lastResponse ? JSON.stringify(lastResponse, null, 2) : 'No tool activity yet.'}</pre>
          </section>
        </aside>
      </section>

      {pendingApproval ? (
        <section className="approval-bar">
          <div>
            <p className="eyebrow">Approval required</p>
            <strong>{pendingApproval.tool_name}</strong>
            <span>{pendingApproval.summary}</span>
          </div>
          <button onClick={() => void confirmPendingRequest()}>Confirm and continue</button>
        </section>
      ) : null}
    </main>
  )
}

export default App
