import { useState } from 'react'

type ToolConsolePanelProps = {
  activeWidgetId?: string
  onExecuteTool: (request: { tool_name: string; input?: Record<string, unknown> }) => void | Promise<void>
}

export function ToolConsolePanel({ activeWidgetId, onExecuteTool }: ToolConsolePanelProps) {
  const [toolCommand, setToolCommand] = useState('pwd')

  return (
    <section className="panel">
      <p className="eyebrow">Tool console</p>
      <h2>AI-native runtime slice</h2>
      <div className="button-row">
        <button onClick={() => void onExecuteTool({ tool_name: 'workspace.list_widgets' })}>List widgets</button>
        <button onClick={() => void onExecuteTool({ tool_name: 'workspace.get_active_widget' })}>Active widget</button>
        <button
          onClick={() =>
            activeWidgetId &&
            void onExecuteTool({
              tool_name: 'term.get_state',
              input: { widget_id: activeWidgetId },
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
          if (!activeWidgetId) {
            return
          }
          void onExecuteTool({
            tool_name: 'term.send_input',
            input: {
              widget_id: activeWidgetId,
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
        <button type="submit" disabled={!activeWidgetId}>
          Run tool
        </button>
      </form>
    </section>
  )
}
