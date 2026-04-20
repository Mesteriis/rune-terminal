import { type DockviewApi } from 'dockview-react'

/** Represents a disposable Dockview subscription owned by the workspace runtime. */
export type DockviewWorkspaceBinding = {
  dispose: () => void
}

/** Coordinates debounced snapshot persistence for one live Dockview instance. */
export type DockviewWorkspacePersistenceController = {
  bind: (api: DockviewApi) => void
  dispose: () => void
  schedule: () => void
}

/** Disposes every registered Dockview subscription for the current runtime session. */
export function disposeDockviewWorkspaceBindings(bindings: DockviewWorkspaceBinding[]) {
  bindings.forEach((binding) => binding.dispose())
}

/** Subscribes persistence scheduling to Dockview mutations that affect layout state. */
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

/** Creates a debounced persistence controller that can be rebound to a new Dockview API instance. */
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

/** Recomputes Dockview layout against the latest measured container size. */
export function syncDockviewWorkspaceLayout(api: DockviewApi | null, container: HTMLDivElement | null) {
  if (!api || !container) {
    return
  }

  api.layout(container.clientWidth, container.clientHeight)
}

/** Defers layout sync until after Dockview and React have both committed the new frame. */
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
