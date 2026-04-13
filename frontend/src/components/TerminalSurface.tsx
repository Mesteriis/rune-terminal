import '@xterm/xterm/css/xterm.css'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { RtermClient } from '../lib/api'
import type { OutputChunk, TerminalSnapshot, TerminalState } from '../types'

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
  const fallbackStateRef = useRef<TerminalState | null>(state)
  const [commandDraft, setCommandDraft] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)
  const [isFollowingOutput, setIsFollowingOutput] = useState(true)
  const followOutputRef = useRef(true)

  useEffect(() => {
    canSendInputRef.current = Boolean(state?.can_send_input)
  }, [state?.can_send_input])

  useEffect(() => {
    fallbackStateRef.current = state
  }, [state])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !widgetId) {
      return
    }
    let disposed = false
    let source: EventSource | null = null
    const fitAddon = new FitAddon()
    container.replaceChildren()

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.18,
      scrollback: 5000,
      allowTransparency: true,
      theme: {
        background: '#06090d',
        foreground: '#e3eef7',
        cursor: '#f7c56f',
        selectionBackground: '#274863',
      },
    })
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    terminalRef.current = terminal

    const focusTerminal = () => {
      focusTerminalTextarea(container, terminal, disposed)
    }

    const refreshFollowState = () => {
      const buffer = terminal.buffer.active
      const nextFollowState = buffer.viewportY >= buffer.baseY
      followOutputRef.current = nextFollowState
      setIsFollowingOutput(nextFollowState)
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

    const onInput = terminal.onData((data) => {
      if (disposed || !canSendInputRef.current) {
        return
      }
      void client.sendTerminalInput(widgetId, data, false).catch(() => {
        // Input errors are surfaced by the terminal status and audit path; keep the UI interactive.
      })
    })
    const textarea = container.querySelector('.xterm-helper-textarea')
    const onTerminalFocus = () => setIsFocused(true)
    const onTerminalBlur = () => setIsFocused(false)
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.addEventListener('focus', onTerminalFocus)
      textarea.addEventListener('blur', onTerminalBlur)
    }

    const viewport = container.querySelector('.xterm-viewport')
    const onViewportScroll = () => refreshFollowState()
    if (viewport instanceof HTMLDivElement) {
      viewport.addEventListener('scroll', onViewportScroll, { passive: true })
    }

    const onOutput = (event: Event) => {
      if (disposed || terminalRef.current !== terminal) {
        return
      }
      const chunk = JSON.parse((event as MessageEvent).data) as OutputChunk
      const shouldFollow = followOutputRef.current
      try {
        terminal.write(chunk.data, () => {
          if (shouldFollow) {
            terminal.scrollToBottom()
          }
        })
      } catch {
        // xterm can throw while the renderer is being replaced during dev-mode remounts.
      }
    }

    const onStreamError = () => {
      if (disposed) {
        return
      }
      if (source) {
        source.removeEventListener('output', onOutput)
        source.close()
        source = null
      }
    }

    async function bootstrapSnapshot() {
      try {
        const snapshot = await client.terminalSnapshot(widgetId, 0, fallbackStateRef.current)
        if (disposed || terminalRef.current !== terminal) {
          return
        }
        hydrateSnapshot(terminal, snapshot)
        refreshFollowState()
        source = new EventSource(client.terminalStreamUrl(widgetId, snapshot.next_seq))
        source.addEventListener('output', onOutput)
        source.addEventListener('error', onStreamError)
      } catch {
        if (!disposed && terminalRef.current === terminal) {
          terminal.clear()
          refreshFollowState()
        }
      } finally {
        if (!disposed) {
          setIsHydrating(false)
        }
      }
    }

    void bootstrapSnapshot()

    container.addEventListener('mousedown', focusTerminal)

    return () => {
      disposed = true
      onInput.dispose()
      if (source) {
        source.removeEventListener('output', onOutput)
        source.removeEventListener('error', onStreamError)
        source.close()
      }
      observer.disconnect()
      container.removeEventListener('mousedown', focusTerminal)
      window.removeEventListener('resize', scheduleFit)
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.removeEventListener('focus', onTerminalFocus)
        textarea.removeEventListener('blur', onTerminalBlur)
      }
      if (viewport instanceof HTMLDivElement) {
        viewport.removeEventListener('scroll', onViewportScroll)
      }
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
    if (!commandDraft.trim()) {
      return
    }
    await client.sendTerminalInput(widgetId, commandDraft, true)
    setCommandDraft('')
    await onTerminalAction?.()
  }

  function handleScrollToLatest() {
    const terminal = terminalRef.current
    if (!terminal) {
      return
    }
    terminal.scrollToBottom()
    followOutputRef.current = true
    setIsFollowingOutput(true)
    focusTerminalTextarea(containerRef.current, terminalRef.current, false)
  }

  function handleClearViewport() {
    const terminal = terminalRef.current
    if (!terminal) {
      return
    }
    terminal.clear()
    focusTerminalTextarea(containerRef.current, terminalRef.current, false)
  }

  const sessionStatusLine = buildSessionStatusLine(state, isHydrating, isFocused, isFollowingOutput)
  const commandStripText = buildCommandStripText(state)

  return (
    <section className={`terminal-card terminal-surface ${isFocused ? 'terminal-surface-focused' : ''}`}>
      <header className="terminal-header">
        <div className="terminal-heading">
          <p className="eyebrow">Terminal</p>
          <h2>{state?.shell ?? 'Shell session'}</h2>
          <p className="terminal-subtitle">{state?.working_dir ?? 'Working directory unavailable'}</p>
        </div>
        <div className="terminal-toolbar-actions">
          <button className="ghost-button compact-button" onClick={() => void onTerminalAction?.()}>
            Refresh
          </button>
          <button className="ghost-button compact-button" onClick={() => focusTerminalTextarea(containerRef.current, terminalRef.current, false)}>
            Focus
          </button>
          <button
            className="ghost-button compact-button"
            onClick={() => (onInterrupt ? void onInterrupt(widgetId) : undefined)}
            disabled={!state?.can_interrupt}
          >
            Interrupt
          </button>
        </div>
      </header>

      <section className="terminal-toolbar">
        <button
          className={`terminal-toolbar-button ${isFollowingOutput ? 'active' : ''}`}
          type="button"
          onClick={handleScrollToLatest}
        >
          {isFollowingOutput ? 'Following output' : 'Jump to latest'}
        </button>
        <button className="terminal-toolbar-button" type="button" onClick={handleClearViewport}>
          Clear view
        </button>
        <div className="terminal-toolbar-spacer" />
        <span className="terminal-toolbar-text">{sessionStatusLine}</span>
      </section>

      <section className="terminal-command-bar">
        <span className={`status-pill status-${state?.status ?? 'unknown'}`}>{state?.status ?? 'unknown'}</span>
        <span className="status-pill">Widget {state?.widget_id ?? widgetId}</span>
        <span className="status-pill">Session {state?.session_id ?? widgetId}</span>
        <span className="status-pill">PID {state?.pid ?? 'n/a'}</span>
        <span className="status-pill">{isFocused ? 'Focused' : 'Click to focus'}</span>
        <span className="status-pill">{isFollowingOutput ? 'Live tail' : 'Scrolled back'}</span>
        <span className="terminal-command-text">{commandStripText}</span>
      </section>

      <div className="terminal-shell" ref={containerRef} />

      <form className="terminal-input-row" onSubmit={handleSubmit}>
        <label className="terminal-input-label">
          Paste command
          <input
            value={commandDraft}
            onChange={(event) => setCommandDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setCommandDraft('')
                focusTerminalTextarea(containerRef.current, terminalRef.current, false)
              }
            }}
            placeholder="Paste or type a command for the active PTY"
            disabled={!state?.can_send_input}
          />
        </label>
        <button
          type="button"
          className="ghost-button"
          onClick={() => focusTerminalTextarea(containerRef.current, terminalRef.current, false)}
        >
          Focus terminal
        </button>
        <button type="submit" disabled={!state?.can_send_input}>
          Send
        </button>
      </form>
    </section>
  )
}

function hydrateSnapshot(terminal: Terminal, snapshot: TerminalSnapshot) {
  if (snapshot.chunks.length === 0) {
    terminal.clear()
    return
  }
  terminal.write(snapshot.chunks.map((chunk) => chunk.data).join(''), () => {
    terminal.scrollToBottom()
  })
}

function focusTerminalTextarea(container: HTMLDivElement | null, terminal: Terminal | null, disposed: boolean) {
  if (!container || !terminal || disposed || !container.isConnected) {
    return
  }
  const textarea = container.querySelector('.xterm-helper-textarea')
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.focus({ preventScroll: true })
  }
}

function buildSessionStatusLine(
  state: TerminalState | null,
  isHydrating: boolean,
  isFocused: boolean,
  isFollowingOutput: boolean,
) {
  const segments = [
    isHydrating ? 'loading scrollback' : 'scrollback ready',
    isFollowingOutput ? 'following output' : 'manual scroll',
    isFocused ? 'focused' : 'click to focus',
  ]

  if (state?.last_output_at) {
    segments.push(`last output ${formatTimestamp(state.last_output_at)}`)
  }

  return segments.join(' · ')
}

function buildCommandStripText(state: TerminalState | null) {
  if (!state) {
    return 'Connecting to runtime shell'
  }

  const shell = state.shell || 'shell'
  const cwd = state.working_dir || 'working dir unavailable'
  const exitCode = state.exit_code != null ? ` · exit ${state.exit_code}` : ''
  return `${shell} · ${cwd}${exitCode}`
}

function formatTimestamp(timestamp: string) {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
