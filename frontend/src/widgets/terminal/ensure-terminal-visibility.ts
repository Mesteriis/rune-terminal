import type { DockviewApi } from 'dockview-react'

import { createTerminalTab } from '@/features/terminal/api/client'
import {
  createNextTerminalPanelId,
  createTerminalPanelParams,
  isTerminalPanel,
  resolveTerminalPanelParams,
} from '@/widgets/terminal/terminal-panel'

export type EnsureAiTerminalVisibilityInput = {
  requestedWidgetId?: string
  requestedWidgetTitle?: string
}

export type EnsureAiTerminalVisibilityResult = {
  widgetId: string
}

function resolveWorkspaceTerminalPanelTitle(panelId: string, requestedTitle?: string) {
  const trimmedRequestedTitle = requestedTitle?.trim()
  const suffixMatch = panelId.match(/-(\d+)$/)

  if (!suffixMatch) {
    return trimmedRequestedTitle || 'Workspace shell'
  }

  return `${trimmedRequestedTitle || 'Workspace shell'} ${suffixMatch[1]}`
}

function resolveWorkspaceTerminalPanelPosition(api: DockviewApi) {
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

function revealExistingTerminalPanel(api: DockviewApi, widgetId: string, title?: string) {
  const existingPanel = findVisibleTerminalPanel(api, widgetId)

  if (existingPanel) {
    existingPanel.api.setActive()
    return {
      widgetId,
    }
  }

  const nextPanelId = createNextTerminalPanelId(api, 'workspace')
  const nextPanel = api.addPanel({
    id: nextPanelId,
    title: resolveWorkspaceTerminalPanelTitle(nextPanelId, title),
    component: 'default',
    tabComponent: 'terminal-tab',
    params: createTerminalPanelParams('workspace', widgetId),
    position: resolveWorkspaceTerminalPanelPosition(api),
  })

  nextPanel.api.setActive()

  return {
    widgetId,
  }
}

export async function ensureAiTerminalVisibility(
  api: DockviewApi | null,
  input: EnsureAiTerminalVisibilityInput,
): Promise<EnsureAiTerminalVisibilityResult> {
  const requestedWidgetId = input.requestedWidgetId?.trim() ?? ''
  const requestedWidgetTitle = input.requestedWidgetTitle?.trim() ?? ''

  if (requestedWidgetId) {
    if (!api) {
      return {
        widgetId: requestedWidgetId,
      }
    }

    return revealExistingTerminalPanel(api, requestedWidgetId, requestedWidgetTitle)
  }

  const runtimeTerminal = await createTerminalTab(requestedWidgetTitle || undefined)

  if (!api) {
    return {
      widgetId: runtimeTerminal.widget_id,
    }
  }

  const nextPanelId = createNextTerminalPanelId(api, 'workspace')
  const nextPanel = api.addPanel({
    id: nextPanelId,
    title: resolveWorkspaceTerminalPanelTitle(nextPanelId, requestedWidgetTitle),
    component: 'default',
    tabComponent: 'terminal-tab',
    params: createTerminalPanelParams('workspace', runtimeTerminal.widget_id, runtimeTerminal.tab_id),
    position: resolveWorkspaceTerminalPanelPosition(api),
  })

  nextPanel.api.setActive()

  return {
    widgetId: runtimeTerminal.widget_id,
  }
}
