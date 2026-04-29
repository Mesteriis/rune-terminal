import { BrowserClipboardProvider, ClipboardAddon } from '@xterm/addon-clipboard'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { TerminalViewport } from '@/shared/ui/primitives'
import type { TerminalSessionState } from '@/shared/ui/components/terminal-status-header'

export type TerminalSurfaceHandle = {
  clearViewport: () => void
  clearSearch: () => void
  copySelection: () => Promise<void>
  findNext: (query: string) => boolean
  findPrevious: (query: string) => boolean
  focus: () => void
  jumpToLatest: () => void
  pasteFromClipboard: () => Promise<void>
}

export type TerminalSearchResult = {
  resultCount: number
  resultIndex: number
}

export type TerminalSurfaceOutputChunk = {
  data: string
  seq: number
  timestamp?: string
}

export type TerminalSurfaceProps = {
  cursorBlink?: boolean
  cursorStyle?: 'block' | 'bar' | 'underline'
  fontSize?: number
  lineHeight?: number
  hostId: string
  outputChunks: TerminalSurfaceOutputChunk[]
  sessionKey: string
  sessionState: TerminalSessionState
  statusMessage?: string | null
  onInput?: (data: string) => void
  onRendererModeChange?: (mode: 'default' | 'webgl') => void
  onRequestSearch?: () => void
  onSearchResultsChange?: (result: TerminalSearchResult) => void
  scrollback?: number
  themeClassTarget?: HTMLElement | null
  themeSignal?: string
  themeMode?: 'adaptive' | 'contrast'
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

function getCssVariableFromElement(element: HTMLElement | null, name: string) {
  if (!element || typeof window === 'undefined') {
    return getCssVariable(name)
  }

  return getComputedStyle(element).getPropertyValue(name).trim()
}

function getAdaptiveTerminalTheme(target: HTMLElement | null) {
  const background =
    getCssVariableFromElement(target, '--runa-terminal-surface-bg') ||
    getCssVariable('--color-surface-glass-soft') ||
    'rgba(9, 16, 15, 0.96)'

  const foreground =
    getCssVariableFromElement(target, '--runa-terminal-text-strong') ||
    getCssVariable('--color-text-primary') ||
    '#edf7f4'

  const muted =
    getCssVariableFromElement(target, '--runa-terminal-text-muted') ||
    getCssVariable('--color-text-muted') ||
    '#8da39d'

  const secondary =
    getCssVariableFromElement(target, '--runa-terminal-text-secondary') ||
    getCssVariable('--color-text-secondary') ||
    '#c5d6d1'

  const accentPrimary =
    getCssVariableFromElement(target, '--runa-terminal-status-running') ||
    getCssVariable('--color-accent-emerald-strong') ||
    '#47c0a0'

  const accentSecondary =
    getCssVariableFromElement(target, '--runa-terminal-status-idle') ||
    getCssVariable('--color-accent-cold-tea') ||
    '#82bcaa'

  return {
    background,
    black: background,
    brightBlack: muted,
    cursor:
      getCssVariableFromElement(target, '--runa-terminal-cursor-color') ||
      getCssVariableFromElement(target, '--runa-terminal-status-running') ||
      getCssVariable('--color-accent-emerald-strong') ||
      '#47c0a0',
    cursorAccent:
      getCssVariableFromElement(target, '--runa-terminal-cursor-accent') ||
      getCssVariable('--color-canvas') ||
      '#06110f',
    cyan: accentSecondary,
    foreground,
    green: accentPrimary,
    red: '#b17373',
    selectionBackground:
      getCssVariableFromElement(target, '--runa-terminal-selection-background') || 'rgba(71, 192, 160, 0.2)',
    white: foreground,
    yellow: '#c2b37f',
    blue: secondary,
    magenta: '#9ea7c9',
    brightBlue: secondary,
    brightCyan: accentSecondary,
    brightGreen: accentPrimary,
    brightMagenta: '#b7c0de',
    brightRed: '#d49797',
    brightWhite: '#f3fbf8',
    brightYellow: '#d8c893',
  }
}

function getContrastTerminalTheme() {
  return {
    background: '#020605',
    black: '#020605',
    brightBlack: '#8da39d',
    brightBlue: '#9fd7ff',
    brightCyan: '#9ef5df',
    brightGreen: '#69f3c6',
    brightMagenta: '#d2c8ff',
    brightRed: '#ffb0b0',
    brightWhite: '#f5fffc',
    brightYellow: '#ffe3a1',
    blue: '#84bff4',
    cursor: '#f5fffc',
    cursorAccent: '#020605',
    cyan: '#82d8c7',
    foreground: '#f0fbf8',
    green: '#47d6b3',
    magenta: '#b8afe6',
    red: '#ff9d9d',
    selectionBackground: 'rgba(245, 255, 252, 0.24)',
    white: '#f0fbf8',
    yellow: '#e7cc84',
  }
}

function getTerminalTheme(mode: 'adaptive' | 'contrast', target: HTMLElement | null) {
  if (mode === 'contrast') {
    return getContrastTerminalTheme()
  }

  return getAdaptiveTerminalTheme(target)
}

function applyTerminalTheme(term: Terminal, target: HTMLElement | null, mode: 'adaptive' | 'contrast') {
  term.options.theme = getTerminalTheme(mode, target)
}

function shouldBlinkCursor(sessionState: TerminalSessionState, cursorBlink: boolean) {
  return cursorBlink && sessionState === 'running'
}

function createSafeLinkHandler() {
  return (_event: MouseEvent, uri: string) => {
    const openedWindow = window.open(uri, '_blank', 'noopener,noreferrer')

    if (openedWindow) {
      try {
        openedWindow.opener = null
      } catch {
        // no-op
      }
    }
  }
}

async function copyTerminalSelection(term: Terminal) {
  if (!navigator.clipboard) {
    return
  }

  const selection = term.getSelection()

  if (!selection) {
    return
  }

  await navigator.clipboard.writeText(selection)
}

async function pasteClipboardIntoTerminal(term: Terminal) {
  if (!navigator.clipboard) {
    return
  }

  const text = await navigator.clipboard.readText()

  if (text) {
    term.paste(text)
  }
}

export const TerminalSurface = forwardRef<TerminalSurfaceHandle, TerminalSurfaceProps>(
  function TerminalSurface(
    {
      cursorBlink = true,
      cursorStyle = 'block',
      fontSize = 13,
      lineHeight = 1.25,
      hostId,
      outputChunks,
      sessionKey,
      sessionState,
      statusMessage = null,
      onInput,
      onRendererModeChange,
      onRequestSearch,
      onSearchResultsChange,
      scrollback = 5000,
      themeClassTarget = null,
      themeSignal,
      themeMode = 'adaptive',
    },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const termRef = useRef<Terminal | null>(null)
    const searchAddonRef = useRef<SearchAddon | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const lastWrittenChunkSeqRef = useRef<number>(0)
    const lastSessionKeyRef = useRef<string | null>(null)
    const lastRenderedStatusMessageRef = useRef<string | null>(null)
    const statusMessageRef = useRef(statusMessage)
    const onInputRef = useRef(onInput)
    const onSearchResultsChangeRef = useRef(onSearchResultsChange)

    useEffect(() => {
      statusMessageRef.current = statusMessage
    }, [statusMessage])

    useEffect(() => {
      onInputRef.current = onInput
    }, [onInput])

    useEffect(() => {
      onSearchResultsChangeRef.current = onSearchResultsChange
    }, [onSearchResultsChange])

    useImperativeHandle(
      ref,
      () => ({
        clearViewport: () => {
          const term = termRef.current

          if (!term) {
            return
          }

          const latestChunkSeq = outputChunks[outputChunks.length - 1]?.seq ?? 0
          term.clear()
          lastWrittenChunkSeqRef.current = latestChunkSeq
          lastRenderedStatusMessageRef.current = statusMessageRef.current?.trim() || null
        },
        clearSearch: () => {
          searchAddonRef.current?.clearDecorations()
        },
        copySelection: async () => {
          const term = termRef.current

          if (!term) {
            return
          }

          await copyTerminalSelection(term)
        },
        findNext: (query) => {
          const searchAddon = searchAddonRef.current

          if (!searchAddon || query.trim() === '') {
            return false
          }

          return searchAddon.findNext(query)
        },
        findPrevious: (query) => {
          const searchAddon = searchAddonRef.current

          if (!searchAddon || query.trim() === '') {
            return false
          }

          return searchAddon.findPrevious(query)
        },
        focus: () => {
          termRef.current?.focus()
        },
        jumpToLatest: () => {
          termRef.current?.scrollToBottom()
          termRef.current?.focus()
        },
        pasteFromClipboard: async () => {
          const term = termRef.current

          if (!term) {
            return
          }

          await pasteClipboardIntoTerminal(term)
        },
      }),
      [outputChunks],
    )

    useEffect(() => {
      if (!viewportRef.current) {
        return
      }

      const term = new Terminal({
        allowTransparency: true,
        convertEol: true,
        cursorBlink: shouldBlinkCursor(sessionState, cursorBlink),
        cursorStyle,
        disableStdin: onInput == null || sessionState === 'exited' || sessionState === 'failed',
        fontFamily: getCssVariable('--font-family-mono') || 'monospace',
        fontSize,
        lineHeight,
        rightClickSelectsWord: true,
        scrollback,
        theme: getTerminalTheme(themeMode, viewportRef.current),
      })
      const fitAddon = new FitAddon()
      const searchAddon = new SearchAddon()
      const webLinksAddon = new WebLinksAddon(createSafeLinkHandler())
      const clipboardAddon = new ClipboardAddon(undefined, new BrowserClipboardProvider())
      let webglAddon: WebglAddon | null = null
      const openTarget = viewportRef.current

      termRef.current = term
      searchAddonRef.current = searchAddon
      fitAddonRef.current = fitAddon
      term.loadAddon(fitAddon)
      term.loadAddon(searchAddon)
      term.loadAddon(webLinksAddon)
      term.loadAddon(clipboardAddon)
      term.open(openTarget)
      applyTerminalTheme(term, openTarget, themeMode)
      onRendererModeChange?.('default')

      try {
        webglAddon = new WebglAddon()
        webglAddon.onContextLoss(() => {
          webglAddon?.dispose()
          onRendererModeChange?.('default')
        })
        term.loadAddon(webglAddon)
        onRendererModeChange?.('webgl')
      } catch {
        webglAddon = null
        onRendererModeChange?.('default')
      }

      term.attachCustomKeyEventHandler((event) => {
        const isModifierPressed = event.ctrlKey || event.metaKey

        if (isModifierPressed && event.key.toLowerCase() === 'f') {
          event.preventDefault()
          onRequestSearch?.()
          return false
        }

        if (isModifierPressed && event.shiftKey && event.key.toLowerCase() === 'c') {
          event.preventDefault()
          void copyTerminalSelection(term)
          return false
        }

        if (isModifierPressed && event.shiftKey && event.key.toLowerCase() === 'v') {
          event.preventDefault()
          void pasteClipboardIntoTerminal(term)
          return false
        }

        return true
      })

      const dataDisposable = term.onData((data) => {
        if (!onInputRef.current) {
          return
        }

        onInputRef.current(data)
      })
      const searchResultsDisposable = searchAddon.onDidChangeResults((result) => {
        onSearchResultsChangeRef.current?.({
          resultCount: result.resultCount,
          resultIndex: result.resultIndex,
        })
      })

      const resizeObserver =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(() => {
              fitAddon.fit()
            })

      resizeObserver?.observe(openTarget)

      const groupClassObserver =
        typeof MutationObserver === 'undefined' || !themeClassTarget
          ? null
          : new MutationObserver(() => {
              applyTerminalTheme(term, openTarget, themeMode)
            })

      if (groupClassObserver && themeClassTarget instanceof HTMLElement) {
        groupClassObserver.observe(themeClassTarget, {
          attributes: true,
          attributeFilter: ['class'],
        })
      }

      const focusTerminal = () => {
        window.setTimeout(() => {
          term.focus()
        }, 0)
      }

      openTarget.addEventListener('pointerdown', focusTerminal, true)

      requestAnimationFrame(() => {
        fitAddon.fit()
        term.focus()
      })

      return () => {
        openTarget.removeEventListener('pointerdown', focusTerminal, true)
        resizeObserver?.disconnect()
        groupClassObserver?.disconnect()
        dataDisposable.dispose()
        searchResultsDisposable.dispose()
        webglAddon?.dispose()
        fitAddonRef.current = null
        searchAddonRef.current = null
        termRef.current = null
        term.dispose()
      }
    }, [hostId, lineHeight, onRendererModeChange, onRequestSearch, themeClassTarget])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      term.options.cursorBlink = shouldBlinkCursor(sessionState, cursorBlink)
      term.options.disableStdin = onInput == null || sessionState === 'exited' || sessionState === 'failed'
    }, [cursorBlink, onInput, sessionState])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      term.options.cursorStyle = cursorStyle
    }, [cursorStyle])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      term.options.fontSize = fontSize
      fitAddonRef.current?.fit()
    }, [fontSize])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      term.options.lineHeight = lineHeight
      fitAddonRef.current?.fit()
    }, [lineHeight])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      term.options.scrollback = scrollback
    }, [scrollback])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      applyTerminalTheme(term, viewportRef.current, themeMode)
    }, [themeMode, themeClassTarget, themeSignal])

    useEffect(() => {
      const term = termRef.current

      if (!term) {
        return
      }

      const shouldResetTerminal = lastSessionKeyRef.current !== sessionKey

      if (shouldResetTerminal) {
        term.clear()
        lastSessionKeyRef.current = sessionKey
        lastWrittenChunkSeqRef.current = 0
        lastRenderedStatusMessageRef.current = null
      }

      const nextChunks = shouldResetTerminal
        ? outputChunks
        : outputChunks.filter((chunk) => chunk.seq > lastWrittenChunkSeqRef.current)

      for (const chunk of nextChunks) {
        term.write(chunk.data)
        lastWrittenChunkSeqRef.current = Math.max(lastWrittenChunkSeqRef.current, chunk.seq)
      }

      const nextStatusMessage = statusMessageRef.current?.trim() ?? ''

      if (outputChunks.length > 0) {
        lastRenderedStatusMessageRef.current = null
        return
      }

      if (nextStatusMessage !== '' && lastRenderedStatusMessageRef.current !== nextStatusMessage) {
        term.clear()
        term.writeln(nextStatusMessage)
        lastRenderedStatusMessageRef.current = nextStatusMessage
      }
    }, [outputChunks, sessionKey, statusMessage])

    return (
      <TerminalViewport
        data-runa-terminal-host=""
        ref={viewportRef}
        runaComponent="terminal-surface-viewport"
        style={viewportStyle}
      />
    )
  },
)
