import { type DockviewApi } from 'dockview-react'

export type DockviewWorkspaceBinding = {
  dispose: () => void
}

export function disposeDockviewWorkspaceBindings(bindings: DockviewWorkspaceBinding[]) {
  bindings.forEach((binding) => binding.dispose())
}

export function bindDockviewWorkspacePersistence(
  api: DockviewApi,
  onWorkspaceMutation: () => void,
): DockviewWorkspaceBinding[] {
  return [
    api.onDidLayoutChange(onWorkspaceMutation),
    api.onDidAddPanel(onWorkspaceMutation),
    api.onDidRemovePanel(onWorkspaceMutation),
    api.onDidMovePanel(onWorkspaceMutation),
    api.onDidAddGroup(onWorkspaceMutation),
    api.onDidRemoveGroup(onWorkspaceMutation),
    api.onDidActivePanelChange(onWorkspaceMutation),
    api.onDidActiveGroupChange(onWorkspaceMutation),
  ]
}

export function syncDockviewWorkspaceLayout(api: DockviewApi | null, container: HTMLDivElement | null) {
  if (!api || !container) {
    return
  }

  api.layout(container.clientWidth, container.clientHeight)
}

export function scheduleDockviewWorkspaceLayoutSync(onLayoutSync: () => void) {
  if (typeof window === 'undefined') {
    onLayoutSync()
    return
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      onLayoutSync()
    })
  })
}
