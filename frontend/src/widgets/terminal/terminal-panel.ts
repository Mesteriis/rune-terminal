import type { DockviewApi } from 'dockview-react'

export type TerminalPanelPreset = 'main' | 'workspace'

export type TerminalPanelParams = {
  preset: TerminalPanelPreset
  title: string
  widgetId: string
}

function getDefaultTerminalWidgetId(preset: TerminalPanelPreset) {
  return preset === 'main' ? 'term-main' : 'term-side'
}

export function createTerminalPanelParams(
  preset: TerminalPanelPreset,
  widgetId = getDefaultTerminalWidgetId(preset),
): TerminalPanelParams {
  if (preset === 'main') {
    return {
      preset,
      title: 'Main terminal',
      widgetId,
    }
  }

  return {
    preset,
    title: 'Workspace shell',
    widgetId,
  }
}

export function getFallbackTerminalPanelParams(panelId: string) {
  return panelId === 'terminal-header'
    ? createTerminalPanelParams('main')
    : createTerminalPanelParams('workspace')
}

export function isTerminalPanelParams(value: unknown): value is TerminalPanelParams {
  if (value == null || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<TerminalPanelParams>

  return (
    (candidate.preset === 'main' || candidate.preset === 'workspace') &&
    typeof candidate.title === 'string' &&
    typeof candidate.widgetId === 'string'
  )
}

export function resolveTerminalPanelParams(panelId: string, params: unknown) {
  return isTerminalPanelParams(params) ? params : getFallbackTerminalPanelParams(panelId)
}

export function isTerminalPanel(panelId: string, params: unknown) {
  return (
    isTerminalPanelParams(params) ||
    panelId === 'terminal' ||
    panelId === 'terminal-header' ||
    panelId.startsWith('terminal-') ||
    panelId.startsWith('terminal-header-')
  )
}

function getTerminalPanelIdSeed(preset: TerminalPanelPreset) {
  return preset === 'main' ? 'terminal-header' : 'terminal'
}

export function createNextTerminalPanelId(containerApi: DockviewApi, preset: TerminalPanelPreset) {
  const idSeed = getTerminalPanelIdSeed(preset)

  if (!containerApi.getPanel(idSeed)) {
    return idSeed
  }

  let index = 2

  while (containerApi.getPanel(`${idSeed}-${index}`)) {
    index += 1
  }

  return `${idSeed}-${index}`
}
