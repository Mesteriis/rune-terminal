import type { AgentToolExecuteResponse } from '@/features/agent/api/client'
import { fetchTerminalSnapshot } from '@/features/terminal/api/client'

const runCommandPattern = /^\/run(?:\s+([\s\S]*))?$/
const runOutputInitialPollIntervalMs = 100
const runOutputMaxPollIntervalMs = 500
const runOutputWaitTimeoutMs = 1500

export function getRunCommand(prompt: string) {
  const match = prompt.match(runCommandPattern)

  if (!match) {
    return null
  }

  return match[1]?.trim() ?? ''
}

export function targetSessionForConnectionKind(connectionKind: string | undefined) {
  return connectionKind === 'ssh' ? 'remote' : 'local'
}

export function delayWithAbort(delayMs: number, signal?: AbortSignal) {
  if (!signal) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, delayMs)
    })
  }

  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
  }

  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)

    const onAbort = () => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export async function waitForTerminalOutput(widgetId: string, fromSeq: number, signal?: AbortSignal) {
  const deadline = Date.now() + runOutputWaitTimeoutMs
  let nextDelayMs = runOutputInitialPollIntervalMs
  let latestSnapshot = await fetchTerminalSnapshot(widgetId, fromSeq, signal)

  while (latestSnapshot.next_seq <= fromSeq && latestSnapshot.chunks.length === 0 && Date.now() < deadline) {
    await delayWithAbort(nextDelayMs, signal)
    latestSnapshot = await fetchTerminalSnapshot(widgetId, fromSeq, signal)
    nextDelayMs = Math.min(runOutputMaxPollIntervalMs, Math.round(nextDelayMs * 1.6))
  }

  return latestSnapshot
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}

export function getApprovalToken(response: AgentToolExecuteResponse) {
  const output = response.output

  if (output && typeof output === 'object') {
    const token = (output as { approval_token?: unknown }).approval_token
    if (typeof token === 'string' && token.trim() !== '') {
      return token
    }
  }

  throw new Error('Approval confirmation did not return an approval token.')
}

export function agentSelectionOptionsFromItems(
  items: Array<{ id: string; name: string; description: string }>,
) {
  return items.map((item) => ({
    value: item.id,
    label: item.name,
    description: item.description,
  }))
}
