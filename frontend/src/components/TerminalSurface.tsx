import '@xterm/xterm/css/xterm.css'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useMemo, useRef, useState } from 'react'

import { RtermClient } from '../lib/api'
import type { OutputChunk, TerminalState } from '../types'

type TerminalSurfaceProps = {
  client: RtermClient
  widgetId: string
  state: TerminalState | null
  onTerminalAction?: () => Promise<void> | void
}

export function TerminalSurface({ client, widgetId, state, onTerminalAction }: TerminalSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const [input, setInput] = useState('')
  const fitAddon = useMemo(() => new FitAddon(), [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#09111b',
        foreground: '#e3eef7',
        cursor: '#f7c56f',
        selectionBackground: '#274863',
      },
    })
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    fitAddon.fit()
    terminalRef.current = terminal

    const observer = new ResizeObserver(() => fitAddon.fit())
    observer.observe(container)

    return () => {
      observer.disconnect()
      terminal.dispose()
      terminalRef.current = null
    }
  }, [fitAddon])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal || !widgetId) {
      return
    }

    terminal.reset()
    const source = new EventSource(client.terminalStreamUrl(widgetId, 0))
    const onOutput = (event: Event) => {
      const chunk = JSON.parse((event as MessageEvent).data) as OutputChunk
      terminal.write(chunk.data)
    }
    source.addEventListener('output', onOutput)
    return () => {
      source.removeEventListener('output', onOutput)
      source.close()
    }
  }, [client, widgetId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.trim()) {
      return
    }
    await client.sendTerminalInput(widgetId, input, true)
    setInput('')
    await onTerminalAction?.()
  }

  return (
    <section className="terminal-card">
      <header className="terminal-header">
        <div>
          <p className="eyebrow">Live terminal</p>
          <h2>{state?.widget_id ?? widgetId}</h2>
        </div>
        <dl className="terminal-meta">
          <div>
            <dt>Status</dt>
            <dd>{state?.status ?? 'unknown'}</dd>
          </div>
          <div>
            <dt>PID</dt>
            <dd>{state?.pid ?? 'n/a'}</dd>
          </div>
        </dl>
      </header>

      <div className="terminal-shell" ref={containerRef} />

      <form className="terminal-input-row" onSubmit={handleSubmit}>
        <label className="terminal-input-label">
          Direct terminal input
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a command for the active terminal"
            disabled={!state?.can_send_input}
          />
        </label>
        <button type="submit" disabled={!state?.can_send_input}>
          Send
        </button>
      </form>
    </section>
  )
}

