import { type DockviewApi, type SerializedDockview } from 'dockview-react'

import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'

/** Detects whether the default shell layout has already been seeded into Dockview. */
export function hasDockviewWorkspaceBootstrap(api: DockviewApi) {
  return Boolean(api.getPanel('terminal-header'))
}

/** Seeds the initial terminal-plus-commander layout used by new workspaces. */
export function seedDockviewWorkspaceBootstrap(api: DockviewApi): SerializedDockview {
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

  return api.toJSON()
}
