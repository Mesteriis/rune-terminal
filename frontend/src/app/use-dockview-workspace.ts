import { useEffect, useRef, useState } from 'react'
import { type DockviewApi, type DockviewReadyEvent } from 'dockview-react'

import { createTerminalPanelParams } from '@/widgets/terminal/terminal-panel'
import {
  createDefaultWorkspaceTabs,
  DEFAULT_ACTIVE_WORKSPACE_ID,
  readPersistedDockviewWorkspaceState,
  type PersistedDockviewWorkspaceState,
  type WorkspaceLayoutTab,
  writePersistedDockviewWorkspaceState,
} from './dockview-workspace.persistence'

const DOCKVIEW_PERSIST_DEBOUNCE_MS = 120

export function useDockviewWorkspace() {
  const dockviewApiRef = useRef<DockviewApi | null>(null)
  const dockviewContainerRef = useRef<HTMLDivElement | null>(null)
  const initialWorkspaceStateRef = useRef<PersistedDockviewWorkspaceState | null>(
    readPersistedDockviewWorkspaceState(),
  )
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
        workspace.id === activeId ? { ...workspace, snapshot: nextSnapshot } : workspace,
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
    writePersistedDockviewWorkspaceState({
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
