import { useEffect, useRef, useState } from 'react'
import { type DockviewApi, type DockviewReadyEvent, type SerializedDockview } from 'dockview-react'

import { type ShellWorkspaceTab } from '@/widgets'
import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'

const DOCKVIEW_WORKSPACE_STORAGE_KEY = 'runa-terminal:dockview-workspaces:v1'
const DOCKVIEW_PERSIST_DEBOUNCE_MS = 120
const DEFAULT_ACTIVE_WORKSPACE_ID = 2

type WorkspaceLayoutTab = ShellWorkspaceTab & {
  snapshot: SerializedDockview | null
}

type PersistedDockviewWorkspaceState = {
  activeWorkspaceId: number
  workspaceTabs: WorkspaceLayoutTab[]
}

function createDefaultWorkspaceTabs(): WorkspaceLayoutTab[] {
  return [
    { id: 1, title: 'Workspace-1', snapshot: null },
    { id: 2, title: 'Workspace-2', snapshot: null },
  ]
}

function readPersistedWorkspaceState(): PersistedDockviewWorkspaceState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(DOCKVIEW_WORKSPACE_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedDockviewWorkspaceState>

    if (!Array.isArray(parsedValue.workspaceTabs) || typeof parsedValue.activeWorkspaceId !== 'number') {
      return null
    }

    const workspaceTabs = parsedValue.workspaceTabs
      .filter((workspace): workspace is WorkspaceLayoutTab =>
        Boolean(
          workspace
          && typeof workspace.id === 'number'
          && typeof workspace.title === 'string'
          && ('snapshot' in workspace),
        ),
      )
      .map((workspace) => ({
        id: workspace.id,
        title: workspace.title,
        snapshot: workspace.snapshot ?? null,
      }))

    if (workspaceTabs.length === 0) {
      return null
    }

    const hasActiveWorkspace = workspaceTabs.some((workspace) => workspace.id === parsedValue.activeWorkspaceId)

    if (!hasActiveWorkspace) {
      return null
    }

    return {
      activeWorkspaceId: parsedValue.activeWorkspaceId,
      workspaceTabs,
    }
  } catch {
    return null
  }
}

function writePersistedWorkspaceState(state: PersistedDockviewWorkspaceState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DOCKVIEW_WORKSPACE_STORAGE_KEY, JSON.stringify(state))
}

export function useDockviewWorkspace() {
  const dockviewApiRef = useRef<DockviewApi | null>(null)
  const dockviewContainerRef = useRef<HTMLDivElement | null>(null)
  const initialWorkspaceStateRef = useRef<PersistedDockviewWorkspaceState | null>(readPersistedWorkspaceState())
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceLayoutTab[]>(
    initialWorkspaceStateRef.current?.workspaceTabs ?? createDefaultWorkspaceTabs(),
  )
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialWorkspaceStateRef.current?.activeWorkspaceId ?? DEFAULT_ACTIVE_WORKSPACE_ID,
  )
  const workspaceTabsRef = useRef<WorkspaceLayoutTab[]>(
    initialWorkspaceStateRef.current?.workspaceTabs ?? createDefaultWorkspaceTabs(),
  )
  const activeWorkspaceIdRef = useRef(
    initialWorkspaceStateRef.current?.activeWorkspaceId ?? DEFAULT_ACTIVE_WORKSPACE_ID,
  )
  const dockviewPersistenceTimeoutRef = useRef<number | null>(null)
  const dockviewPersistenceDisposablesRef = useRef<Array<{ dispose: () => void }>>([])

  const updateWorkspaceTabs = (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => {
    const nextTabs = updater(workspaceTabsRef.current)
    workspaceTabsRef.current = nextTabs
    setWorkspaceTabs(nextTabs)
  }

  const disposeDockviewPersistenceBindings = () => {
    dockviewPersistenceDisposablesRef.current.forEach((disposable) => disposable.dispose())
    dockviewPersistenceDisposablesRef.current = []
  }

  const syncDockviewLayout = () => {
    const api = dockviewApiRef.current
    const container = dockviewContainerRef.current

    if (!api || !container) {
      return
    }

    api.layout(container.clientWidth, container.clientHeight)
  }

  const scheduleDockviewLayoutSync = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        syncDockviewLayout()
      })
    })
  }

  const persistCurrentWorkspaceSnapshot = () => {
    const api = dockviewApiRef.current

    if (!api) {
      return
    }

    const activeId = activeWorkspaceIdRef.current
    const nextSnapshot = api.panels.length > 0 ? api.toJSON() : null

    updateWorkspaceTabs((tabs) =>
      tabs.map((workspace) =>
        workspace.id === activeId
          ? { ...workspace, snapshot: nextSnapshot }
          : workspace,
      ),
    )
  }

  const schedulePersistCurrentWorkspaceSnapshot = () => {
    if (typeof window === 'undefined') {
      return
    }

    if (dockviewPersistenceTimeoutRef.current !== null) {
      window.clearTimeout(dockviewPersistenceTimeoutRef.current)
    }

    dockviewPersistenceTimeoutRef.current = window.setTimeout(() => {
      dockviewPersistenceTimeoutRef.current = null
      persistCurrentWorkspaceSnapshot()
    }, DOCKVIEW_PERSIST_DEBOUNCE_MS)
  }

  const bindDockviewPersistence = (api: DockviewApi) => {
    disposeDockviewPersistenceBindings()

    dockviewPersistenceDisposablesRef.current = [
      api.onDidLayoutChange(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidAddPanel(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidRemovePanel(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidMovePanel(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidAddGroup(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidRemoveGroup(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidActivePanelChange(schedulePersistCurrentWorkspaceSnapshot),
      api.onDidActiveGroupChange(schedulePersistCurrentWorkspaceSnapshot),
    ]
  }

  const restoreWorkspaceSnapshot = (workspaceId: number) => {
    const api = dockviewApiRef.current

    if (!api) {
      return
    }

    const targetWorkspace = workspaceTabsRef.current.find((workspace) => workspace.id === workspaceId)

    if (!targetWorkspace?.snapshot) {
      api.clear()
      scheduleDockviewLayoutSync()
      return
    }

    api.fromJSON(targetWorkspace.snapshot)
    scheduleDockviewLayoutSync()
  }

  const handleSelectWorkspace = (workspaceId: number) => {
    if (workspaceId === activeWorkspaceIdRef.current) {
      return
    }

    persistCurrentWorkspaceSnapshot()
    activeWorkspaceIdRef.current = workspaceId
    setActiveWorkspaceId(workspaceId)
    restoreWorkspaceSnapshot(workspaceId)
  }

  const handleAddWorkspace = () => {
    persistCurrentWorkspaceSnapshot()

    const nextWorkspaceId = workspaceTabsRef.current.length + 1
    const nextWorkspace: WorkspaceLayoutTab = {
      id: nextWorkspaceId,
      title: `Workspace-${nextWorkspaceId}`,
      snapshot: null,
    }

    updateWorkspaceTabs((tabs) => [...tabs, nextWorkspace])
    activeWorkspaceIdRef.current = nextWorkspaceId
    setActiveWorkspaceId(nextWorkspaceId)

    const api = dockviewApiRef.current

    if (api) {
      api.clear()
      scheduleDockviewLayoutSync()
    }
  }

  const handleDockviewReady = (event: DockviewReadyEvent) => {
    const api = event.api
    dockviewApiRef.current = api
    bindDockviewPersistence(api)

    if (api.getPanel('terminal-header')) {
      scheduleDockviewLayoutSync()
      return
    }

    const initialWorkspace = workspaceTabsRef.current.find(
      (workspace) => workspace.id === activeWorkspaceIdRef.current,
    )

    if (initialWorkspace?.snapshot) {
      api.fromJSON(initialWorkspace.snapshot)
      scheduleDockviewLayoutSync()
      return
    }

    if (initialWorkspaceStateRef.current) {
      api.clear()
      scheduleDockviewLayoutSync()
      return
    }

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

    const initialWorkspaceSnapshot = api.toJSON()

    updateWorkspaceTabs((tabs) =>
      tabs.map((workspace) =>
        workspace.id === DEFAULT_ACTIVE_WORKSPACE_ID
          ? { ...workspace, snapshot: initialWorkspaceSnapshot }
          : workspace,
      ),
    )

    scheduleDockviewLayoutSync()
  }

  useEffect(() => {
    const container = dockviewContainerRef.current

    if (!container || typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      syncDockviewLayout()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    writePersistedWorkspaceState({
      activeWorkspaceId,
      workspaceTabs,
    })
  }, [activeWorkspaceId, workspaceTabs])

  useEffect(() => {
    return () => {
      disposeDockviewPersistenceBindings()

      if (dockviewPersistenceTimeoutRef.current !== null) {
        window.clearTimeout(dockviewPersistenceTimeoutRef.current)
      }
    }
  }, [])

  return {
    activeWorkspaceId,
    workspaceTabs,
    dockviewApiRef,
    dockviewContainerRef,
    handleAddWorkspace,
    handleDockviewReady,
    handleSelectWorkspace,
  }
}
