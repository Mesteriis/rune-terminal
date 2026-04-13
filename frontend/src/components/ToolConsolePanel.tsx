import { useMemo, useState } from 'react'

import type { ExecuteToolRequest, ExecuteToolResponse, ToolInfo, WorkspaceContextSummary } from '../types'

type ToolConsolePanelProps = {
  tools: ToolInfo[]
  workspaceContext: WorkspaceContextSummary | null
  lastResponse: ExecuteToolResponse | null
  onExecuteTool: (request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<unknown>
}

export function ToolConsolePanel({
  tools,
  workspaceContext,
  lastResponse,
  onExecuteTool,
}: ToolConsolePanelProps) {
  const [selectedToolName, setSelectedToolName] = useState('workspace.list_widgets')
  const [payloadText, setPayloadText] = useState('{}')
  const [payloadError, setPayloadError] = useState<string | null>(null)

  const selectedTool = useMemo(() => {
    return tools.find((tool) => tool.name === selectedToolName) ?? tools[0] ?? null
  }, [selectedToolName, tools])

  function handleExecute() {
    if (!selectedTool) {
      return
    }
    try {
      const parsed = parsePayload(payloadText)
      setPayloadError(null)
      const request: ExecuteToolRequest = {
        tool_name: selectedTool.name,
        input: parsed,
      }
      void onExecuteTool(request)
    } catch (error) {
      setPayloadError(error instanceof Error ? error.message : String(error))
    }
  }

  function handleSelectTool(toolName: string) {
    setSelectedToolName(toolName)
    setPayloadText(JSON.stringify(defaultToolPayload(toolName, workspaceContext), null, 2))
    setPayloadError(null)
  }

  return (
    <>
      <section className="panel">
        <p className="eyebrow">Operator panel</p>
        <h2>Tool runtime console</h2>
        <div className="operator-context">
          <div>
            <span>Workspace</span>
            <strong>{workspaceContext?.workspace_id ?? 'loading'}</strong>
          </div>
          <div>
            <span>Focused widget</span>
            <strong>{workspaceContext?.active_widget_id ?? 'n/a'}</strong>
          </div>
        </div>
        <div className="tool-layout">
          <div className="tool-catalog">
            {tools.map((tool) => (
              <button
                key={tool.name}
                className={`tool-pill ${tool.name === selectedTool?.name ? 'active' : ''}`}
                onClick={() => handleSelectTool(tool.name)}
              >
                <strong>{tool.name}</strong>
                <span>{tool.metadata.approval_tier}</span>
              </button>
            ))}
          </div>
          {selectedTool ? (
            <div className="tool-detail">
              <div className="tool-summary">
                <strong>{selectedTool.name}</strong>
                <span>{selectedTool.description}</span>
              </div>
              <div className="audit-tags">
                <span>{selectedTool.metadata.target_kind}</span>
                <span>{selectedTool.metadata.approval_tier}</span>
                <span>{selectedTool.metadata.mutating ? 'mutating' : 'read-only'}</span>
              </div>
              <label className="stack-form">
                <span>Manual payload</span>
                <textarea
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                  spellCheck={false}
                  rows={8}
                />
              </label>
              {payloadError ? <p className="field-error">{payloadError}</p> : null}
              <div className="button-row">
                <button onClick={handleExecute}>Execute tool</button>
              </div>
              <details className="panel-details">
                <summary>Tool metadata</summary>
                <pre>{JSON.stringify(selectedTool.metadata, null, 2)}</pre>
              </details>
              <details className="panel-details">
                <summary>Input schema</summary>
                <pre>{JSON.stringify(selectedTool.input_schema, null, 2)}</pre>
              </details>
              <details className="panel-details">
                <summary>Output schema</summary>
                <pre>{JSON.stringify(selectedTool.output_schema, null, 2)}</pre>
              </details>
            </div>
          ) : (
            <p>No tools registered.</p>
          )}
        </div>
      </section>

      <section className="panel response-panel">
        <p className="eyebrow">Last tool response</p>
        <pre>{lastResponse ? JSON.stringify(lastResponse, null, 2) : 'No tool activity yet.'}</pre>
      </section>
    </>
  )
}

function defaultToolPayload(toolName: string, context: WorkspaceContextSummary | null) {
  const widgetID = context?.active_widget_id
  switch (toolName) {
    case 'term.get_state':
    case 'term.interrupt':
      return widgetID ? { widget_id: widgetID } : {}
    case 'term.send_input':
      return widgetID ? { widget_id: widgetID, text: 'pwd', append_newline: true } : { text: 'pwd', append_newline: true }
    case 'workspace.focus_widget':
      return widgetID ? { widget_id: widgetID } : {}
    case 'safety.confirm':
      return { approval_id: '' }
    default:
      return {}
  }
}

function parsePayload(raw: string) {
  if (!raw.trim()) {
    return undefined
  }
  const parsed = JSON.parse(raw) as unknown
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Tool payload must be a JSON object.')
  }
  return parsed as Record<string, unknown>
}
