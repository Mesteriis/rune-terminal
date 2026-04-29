import { createEvent, createStore } from 'effector'

export type TerminalPanelPreset = 'main' | 'workspace'

export type TerminalPanelBinding = {
  hostId: string
  preset: TerminalPanelPreset
  runtimeTabId?: string
  runtimeWidgetId: string
}

export type TerminalPanelBindings = Record<string, TerminalPanelBinding>

export const registerTerminalPanelBinding = createEvent<TerminalPanelBinding>()
export const unregisterTerminalPanelBinding = createEvent<{ hostId: string }>()
export const resetTerminalPanelBindingsForTests = createEvent()

export const $terminalPanelBindings = createStore<TerminalPanelBindings>({})
  .on(registerTerminalPanelBinding, (bindings, binding) => ({
    ...bindings,
    [binding.hostId]: binding,
  }))
  .on(unregisterTerminalPanelBinding, (bindings, payload) => {
    if (!(payload.hostId in bindings)) {
      return bindings
    }

    const nextBindings = { ...bindings }
    delete nextBindings[payload.hostId]
    return nextBindings
  })
  .reset(resetTerminalPanelBindingsForTests)

export function resolveTerminalPanelBinding(bindings: TerminalPanelBindings, activeHostId: string | null) {
  if (activeHostId && bindings[activeHostId]) {
    return bindings[activeHostId]
  }

  return bindings.terminal ?? bindings['terminal-header'] ?? Object.values(bindings)[0] ?? null
}
