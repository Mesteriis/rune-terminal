const terminalDisplayIdRegistry = new Map<string, string>()

let nextTerminalDisplayOrdinal = 1

export function resolveTerminalDisplayWidgetId(runtimeWidgetId: string) {
  const normalizedWidgetId = runtimeWidgetId.trim()

  if (normalizedWidgetId === '') {
    return 'term_?'
  }

  const existingDisplayId = terminalDisplayIdRegistry.get(normalizedWidgetId)

  if (existingDisplayId) {
    return existingDisplayId
  }

  const nextDisplayId = `term_${nextTerminalDisplayOrdinal}`
  nextTerminalDisplayOrdinal += 1
  terminalDisplayIdRegistry.set(normalizedWidgetId, nextDisplayId)
  return nextDisplayId
}

export function resetTerminalDisplayWidgetIdRegistry() {
  terminalDisplayIdRegistry.clear()
  nextTerminalDisplayOrdinal = 1
}
