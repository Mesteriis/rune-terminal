import type { DockviewApi } from 'dockview-react'

import { createRemoteProfileSession } from '@/features/remote/api/client'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from '@/widgets/terminal/terminal-panel'

type OpenRemoteProfileSessionInput = {
  profileId: string
  title?: string
  tmuxSession?: string
}

function resolvePanelTitle(panelId: string, title?: string) {
  const trimmedTitle = title?.trim()
  const suffixMatch = panelId.match(/-(\d+)$/)
  if (!suffixMatch) {
    return trimmedTitle || 'Remote Shell'
  }
  return `${trimmedTitle || 'Remote Shell'} ${suffixMatch[1]}`
}

function resolvePanelPosition(api: DockviewApi) {
  const activePanel = api.activePanel
  if (!activePanel) {
    return undefined
  }
  return {
    direction: 'right' as const,
    referencePanel: activePanel.id,
  }
}

function findVisibleTerminalPanel(api: DockviewApi, widgetId: string) {
  return api.panels.find((panel) => {
    if (!isTerminalPanel(panel.id, panel.params)) {
      return false
    }
    return resolveTerminalPanelParams(panel.id, panel.params).widgetId === widgetId
  })
}

export async function openRemoteProfileSession(
  api: DockviewApi | null,
  input: OpenRemoteProfileSessionInput,
) {
  const result = await createRemoteProfileSession(input.profileId, {
    title: input.title,
    tmux_session: input.tmuxSession,
  })

  if (!api) {
    return result
  }

  const existingPanel = findVisibleTerminalPanel(api, result.widget_id)
  if (existingPanel) {
    existingPanel.api.setActive()
    return result
  }

  const nextPanelId = createNextTerminalPanelId(api, 'workspace')
  const panel = api.addPanel({
    id: nextPanelId,
    title: resolvePanelTitle(nextPanelId, input.title),
    component: 'default',
    tabComponent: 'terminal-tab',
    params: createTerminalPanelParams('workspace', result.widget_id, result.tab_id),
    position: resolvePanelPosition(api),
  })
  panel.api.setActive()

  return result
}
