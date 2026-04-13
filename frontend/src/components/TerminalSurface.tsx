import '@xterm/xterm/css/xterm.css'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { RtermClient } from '../lib/api'
import type { OutputChunk, TerminalState } from '../types'

type TerminalSurfaceProps = {
  client: RtermClient
  widgetId: string
  state: TerminalState | null
  onTerminalAction?: () => Promise<void> | void
  onInterrupt?: (widgetId: string) => Promise<void> | void
}

export function TerminalSurface({ client, widgetId, state, onTerminalAction, onInterrupt }: TerminalSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitFrameRef = useRef<number | null>(null)
  const canSendInputRef = useRef(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    canSendInputRef.current = Boolean(state?.can_send_input)
  }, [state?.can_send_input])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !widgetId) {
      return
    }
    let disposed = false
    const fitAddon = new FitAddon()
    container.replaceChildren()

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
    terminalRef.current = terminal

    const focusTerminal = () => {
      if (disposed || terminalRef.current !== terminal || !container.isConnected) {
        return
      }
      const textarea = container.querySelector('.xterm-helper-textarea')
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus()
      }
    }

    const scheduleFit = () => {
      if (disposed || fitFrameRef.current !== null) {
        return
      }
      fitFrameRef.current = window.requestAnimationFrame(() => {
        fitFrameRef.current = null
        if (disposed || terminalRef.current !== terminal || !container.isConnected) {
          return
        }
        try {
          fitAddon.fit()
        } catch {
          // xterm may emit resize callbacks while the renderer is tearing down.
        }
      })
    }

    scheduleFit()

    const observer = new ResizeObserver(() => {
      scheduleFit()
    })
    observer.observe(container)
    window.addEventListener('resize', scheduleFit)
    window.requestAnimationFrame(focusTerminal)

    const source = new EventSource(client.terminalStreamUrl(widgetId, 0))
    const onInput = terminal.onData((data) => {
      if (disposed || !canSendInputRef.current) {
        return
      }
      void client.sendTerminalInput(widgetId, data, false).catch(() => {
        // Input errors are surfaced by the terminal status and audit path; keep the UI interactive.
      })
    })
    const onOutput = (event: Event) => {
      if (disposed || terminalRef.current !== terminal) {
        return
      }
      const chunk = JSON.parse((event as MessageEvent).data) as OutputChunk
      try {
        terminal.write(chunk.data)
      } catch {
        // xterm can throw while the renderer is being replaced during dev-mode remounts.
      }
    }
    source.addEventListener('output', onOutput)
    container.addEventListener('mousedown', focusTerminal)

    return () => {
      disposed = true
      onInput.dispose()
      source.removeEventListener('output', onOutput)
      source.close()
      observer.disconnect()
      container.removeEventListener('mousedown', focusTerminal)
      window.removeEventListener('resize', scheduleFit)
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current)
        fitFrameRef.current = null
      }
      terminalRef.current = null
      terminal.dispose()
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
        <div className="terminal-heading">
          <p className="eyebrow">Live terminal</p>
          <h2>{state?.widget_id ?? widgetId}</h2>
          <p className="terminal-subtitle">
            Focused widget shell. Keyboard input streams directly into the active PTY session.
          </p>
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
          <div>
            <dt>Shell</dt>
            <dd>{state?.shell ?? 'n/a'}</dd>
          </div>
        </dl>
      </header>

      <section className="terminal-status-bar">
        <span className={`status-pill status-${state?.status ?? 'unknown'}`}>{state?.status ?? 'unknown'}</span>
        <span className="status-pill">Widget {state?.widget_id ?? widgetId}</span>
        <span className="status-pill status-path">{state?.working_dir ?? 'working dir unavailable'}</span>
        <div className="terminal-actions">
          <button
            className="ghost-button"
            onClick={() => (onInterrupt ? void onInterrupt(widgetId) : undefined)}
            disabled={!state?.can_interrupt}
          >
            Interrupt
          </button>
        </div>
      </section>

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
