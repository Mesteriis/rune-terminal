import type { DockviewApi } from 'dockview-react'

import type {
  TerminalConnectionKind,
  TerminalSessionState,
} from '@/shared/ui/components'

export type TerminalPanelPreset = 'main' | 'workspace'

export type TerminalPanelParams = {
  preset: TerminalPanelPreset
  title: string
  cwd: string
  shellLabel: string
  connectionKind: TerminalConnectionKind
  sessionState: TerminalSessionState
  introLines?: string[]
}

export function createTerminalPanelParams(preset: TerminalPanelPreset): TerminalPanelParams {
  if (preset === 'main') {
    return {
      preset,
      title: 'Main terminal',
      cwd: '~/projects/runa-terminal',
      shellLabel: 'zsh',
      connectionKind: 'local',
      sessionState: 'running',
      introLines: [
        'last login: Sat Apr 19 10:32 on ttys004',
        'workspace restored from frontend renderer mock',
      ],
    }
  }

  return {
    preset,
    title: 'Workspace shell',
    cwd: '~/projects/runa-terminal/frontend',
    shellLabel: 'zsh',
    connectionKind: 'local',
    sessionState: 'idle',
    introLines: [
      'renderer preview: xterm surface is mounted locally',
      'backend input/stream wiring will attach in the next slice',
    ],
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
    (candidate.preset === 'main' || candidate.preset === 'workspace')
    && typeof candidate.title === 'string'
    && typeof candidate.cwd === 'string'
    && typeof candidate.shellLabel === 'string'
  )
}

export function resolveTerminalPanelParams(panelId: string, params: unknown) {
  return isTerminalPanelParams(params)
    ? params
    : getFallbackTerminalPanelParams(panelId)
}

export function isTerminalPanel(panelId: string, params: unknown) {
  return isTerminalPanelParams(params)
    || panelId === 'terminal'
    || panelId === 'terminal-header'
    || panelId.startsWith('terminal-')
    || panelId.startsWith('terminal-header-')
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
