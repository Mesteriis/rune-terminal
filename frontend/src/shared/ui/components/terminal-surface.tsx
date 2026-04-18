import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef } from 'react'

import { TerminalViewport } from '../primitives'
import type { TerminalConnectionKind, TerminalSessionState } from './terminal-status-header'

export type TerminalSurfaceProps = {
  hostId: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  introLines?: string[]
}

const viewportStyle = {
  flex: 1,
  minHeight: 0,
  padding: 'var(--padding-terminal-surface)',
}

function getCssVariable(name: string) {
  if (typeof window === 'undefined') {
    return ''
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function getPromptLabel(connectionKind: TerminalConnectionKind, cwd: string) {
  const hostLabel = connectionKind === 'ssh' ? 'remote' : 'local'

  return `${hostLabel}:${cwd} $ `
}

function isPrintableInput(data: string) {
  return data >= ' ' && data !== '\u007f'
}

function writeCommandResult(term: Terminal, command: string, cwd: string) {
  if (command === '') {
    return false
  }

  if (command === 'clear') {
    term.clear()
    return true
  }

  if (command === 'pwd') {
    term.writeln(cwd)
    return false
  }

  if (command === 'ls') {
    term.writeln('frontend  docs  core  README.md  package.json')
    return false
  }

  if (command === 'help') {
    term.writeln('renderer-only demo commands: help, pwd, ls, clear, status')
    return false
  }

  if (command === 'status') {
    term.writeln('frontend renderer only: terminal UI is live, backend session wiring is not connected yet')
    return false
  }

  term.writeln(`${command}: renderer-only terminal demo, no backend execution attached`)

  return false
}

export function TerminalSurface({
  hostId,
  cwd,
  shellLabel,
  connectionKind,
  sessionState,
  introLines = [],
}: TerminalSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const introLinesSignature = introLines.join('\n')

  useEffect(() => {
    if (!viewportRef.current) {
      return
    }

    const term = new Terminal({
      allowTransparency: true,
      convertEol: true,
      cursorBlink: sessionState !== 'exited',
      disableStdin: sessionState === 'exited',
      fontFamily: getCssVariable('--font-family-mono') || 'monospace',
      fontSize: 13,
      lineHeight: 1.25,
      rightClickSelectsWord: true,
      theme: {
        background: 'transparent',
        cursor: getCssVariable('--color-accent-emerald-strong') || '#47c0a0',
        cursorAccent: getCssVariable('--color-canvas') || '#06110f',
        foreground: getCssVariable('--color-text-primary') || '#edf7f4',
        selectionBackground: 'rgba(71, 192, 160, 0.2)',
      },
    })
    const fitAddon = new FitAddon()
    const inputBuffer = { current: '' }
    const promptLabel = getPromptLabel(connectionKind, cwd)
    const openTarget = viewportRef.current

    term.loadAddon(fitAddon)
    term.open(openTarget)

    const printPrompt = () => {
      term.write(promptLabel)
    }

    const bootLines = [
      `${shellLabel} attached to ${hostId}`,
      `cwd: ${cwd}`,
      sessionState === 'exited'
        ? 'session state: exited'
        : 'session state: renderer-only mock session',
      ...introLines,
      '',
      'type `help` to interact with the renderer-only terminal demo',
      '',
    ]

    for (const line of bootLines) {
      term.writeln(line)
    }

    printPrompt()

    const dataDisposable = term.onData((data) => {
      if (sessionState === 'exited') {
        return
      }

      if (data === '\u0003') {
        inputBuffer.current = ''
        term.write('^C\r\n')
        printPrompt()
        return
      }

      if (data === '\r') {
        const command = inputBuffer.current.trim()

        term.write('\r\n')
        const didClear = writeCommandResult(term, command, cwd)
        inputBuffer.current = ''

        if (didClear) {
          term.write(promptLabel)
        } else {
          printPrompt()
        }

        fitAddon.fit()
        return
      }

      if (data === '\u007f') {
        if (inputBuffer.current.length === 0) {
          return
        }

        inputBuffer.current = inputBuffer.current.slice(0, -1)
        term.write('\b \b')
        return
      }

      if (!isPrintableInput(data)) {
        return
      }

      inputBuffer.current += data
      term.write(data)
    })

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            fitAddon.fit()
          })

    resizeObserver?.observe(openTarget)

    const focusTerminal = () => {
      term.focus()
    }

    openTarget.addEventListener('click', focusTerminal)

    requestAnimationFrame(() => {
      fitAddon.fit()
      term.focus()
    })

    return () => {
      openTarget.removeEventListener('click', focusTerminal)
      resizeObserver?.disconnect()
      dataDisposable.dispose()
      term.dispose()
    }
  }, [connectionKind, cwd, hostId, introLinesSignature, sessionState, shellLabel])

  return <TerminalViewport data-runa-terminal-host="" ref={viewportRef} style={viewportStyle} />
}
