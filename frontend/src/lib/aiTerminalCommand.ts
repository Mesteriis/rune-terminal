import type { ExecuteToolRequest, TerminalState } from '../types'

export type AgentTerminalCommand = {
  prompt: string
  command: string
  widgetId: string
  request: ExecuteToolRequest
}

const explicitPrefixes = ['/run ', 'run: ']

export function resolveAgentTerminalCommand(prompt: string, activeWidgetId?: string): AgentTerminalCommand | null {
  const trimmed = prompt.trim()
  if (!activeWidgetId) {
    return null
  }
  const prefix = explicitPrefixes.find((candidate) => trimmed.toLowerCase().startsWith(candidate))
  if (!prefix) {
    return null
  }
  const command = trimmed.slice(prefix.length).trim()
  if (!command) {
    return null
  }
  return {
    prompt: trimmed,
    command,
    widgetId: activeWidgetId,
    request: {
      tool_name: 'term.send_input',
      input: {
        widget_id: activeWidgetId,
        text: command,
        append_newline: true,
      },
    },
  }
}

export async function waitForTerminalOutput(
  readSnapshot: (fromSeq: number) => Promise<{ chunks: Array<{ data: string }>; next_seq: number }>,
  fromSeq: number,
): Promise<{ output: string; nextSeq: number }> {
  let nextSeq = fromSeq
  let output = ''
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const snapshot = await readSnapshot(nextSeq)
    nextSeq = snapshot.next_seq
    if (snapshot.chunks.length > 0) {
      output = summarizeChunks(snapshot.chunks)
      break
    }
    await sleep(250)
  }
  return { output, nextSeq }
}

export function summarizeTerminalResult(command: string, output: string, state: TerminalState | null) {
  const lines = [
    `Command: ${command}`,
    state?.status ? `Terminal status: ${state.status}` : null,
    output ? output : 'No terminal output captured yet.',
  ].filter(Boolean)
  return lines.join('\n')
}

function summarizeChunks(chunks: Array<{ data: string }>) {
  const output = chunks.map((chunk) => chunk.data).join('')
  const trimmed = output.trim()
  if (trimmed.length <= 2000) {
    return trimmed
  }
  return trimmed.slice(trimmed.length - 2000)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
