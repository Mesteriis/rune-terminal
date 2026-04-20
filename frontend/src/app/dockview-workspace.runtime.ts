import { type DockviewApi } from 'dockview-react'

export type DockviewWorkspaceBinding = {
  dispose: () => void
}

export type DockviewWorkspacePersistenceController = {
  bind: (api: DockviewApi) => void
  dispose: () => void
  schedule: () => void
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

type CreateDockviewWorkspacePersistenceControllerOptions = {
  debounceMs: number
  onPersistWorkspaceSnapshot: () => void
}

export function createDockviewWorkspacePersistenceController({
  debounceMs,
  onPersistWorkspaceSnapshot,
}: CreateDockviewWorkspacePersistenceControllerOptions): DockviewWorkspacePersistenceController {
  let bindings: DockviewWorkspaceBinding[] = []
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null

  const dispose = () => {
    disposeDockviewWorkspaceBindings(bindings)
    bindings = []

    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const schedule = () => {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId)
    }

    timeoutId = globalThis.setTimeout(() => {
      timeoutId = null
      onPersistWorkspaceSnapshot()
    }, debounceMs)
  }

  const bind = (api: DockviewApi) => {
    disposeDockviewWorkspaceBindings(bindings)
    bindings = bindDockviewWorkspacePersistence(api, schedule)
  }

  return {
    bind,
    dispose,
    schedule,
  }
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
