import { type DockviewApi, type SerializedDockview } from 'dockview-react'

import {
  isWorkspaceWidgetKindCreatable,
  isWorkspaceWidgetKindFrontendLocal,
} from '@/features/workspace/model/widget-catalog'
import { type WorkspaceWidgetKindCatalogEntry } from '@/shared/api/workspace'
import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'

/** Detects whether the default shell layout has already been seeded into Dockview. */
export function hasDockviewWorkspaceBootstrap(api: DockviewApi) {
  return Boolean(api.getPanel('terminal-header'))
}

function canSeedBackendWidgetKind(entries: WorkspaceWidgetKindCatalogEntry[] | undefined, kind: string) {
  if (!entries) {
    return true
  }

  return isWorkspaceWidgetKindCreatable(entries, kind)
}

function canSeedFrontendLocalWidgetKind(
  entries: WorkspaceWidgetKindCatalogEntry[] | undefined,
  kind: string,
) {
  if (!entries) {
    return true
  }

  return isWorkspaceWidgetKindFrontendLocal(entries, kind)
}

/** Seeds the initial terminal-plus-commander layout used by new workspaces. */
export function seedDockviewWorkspaceBootstrap(
  api: DockviewApi,
  widgetCatalogEntries?: WorkspaceWidgetKindCatalogEntry[],
): SerializedDockview {
  const shouldSeedTerminal = canSeedBackendWidgetKind(widgetCatalogEntries, 'terminal')
  const shouldSeedCommander = canSeedFrontendLocalWidgetKind(widgetCatalogEntries, 'commander')

  if (shouldSeedTerminal) {
    api.addPanel({
      id: 'terminal-header',
      title: 'Main terminal',
      component: 'default',
      tabComponent: 'terminal-tab',
      params: createTerminalPanelParams('main'),
    })

    api.addPanel({
      id: 'terminal',
      title: 'Workspace shell',
      component: 'default',
      tabComponent: 'terminal-tab',
      params: createTerminalPanelParams('workspace'),
      position: {
        direction: 'below',
      },
    })
  }

  if (shouldSeedTerminal && shouldSeedCommander) {
    api.addPanel({
      id: 'tool',
      title: 'tool',
      component: 'default',
      tabComponent: 'commander-tab',
      position: {
        direction: 'right',
        referencePanel: 'terminal',
      },
    })
  }

  return api.toJSON()
}
