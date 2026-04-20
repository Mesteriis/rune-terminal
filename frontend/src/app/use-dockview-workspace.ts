import { useEffect, useRef, useState } from 'react'
import { type DockviewApi, type DockviewReadyEvent } from 'dockview-react'

import { addDockviewWorkspace, selectDockviewWorkspace } from './dockview-workspace.actions'
import { dockviewWorkspaceClient, type DockviewWorkspaceClient } from './dockview-workspace.client'
import {
  createDefaultWorkspaceTabs,
  DEFAULT_ACTIVE_WORKSPACE_ID,
  type PersistedDockviewWorkspaceState,
  type WorkspaceLayoutTab,
} from './dockview-workspace.persistence'
import {
  bindDockviewWorkspacePersistence,
  disposeDockviewWorkspaceBindings,
  scheduleDockviewWorkspaceLayoutSync,
  syncDockviewWorkspaceLayout,
  type DockviewWorkspaceBinding,
} from './dockview-workspace.runtime'
import { resolveDockviewWorkspaceReadyState } from './dockview-workspace.ready'
import {
  applyDockviewWorkspaceSnapshot,
  captureDockviewWorkspaceSnapshot,
  readDockviewWorkspaceSnapshot,
  writeDockviewWorkspaceSnapshot,
} from './dockview-workspace.snapshots'

const DOCKVIEW_PERSIST_DEBOUNCE_MS = 120

type UseDockviewWorkspaceOptions = {
  client?: DockviewWorkspaceClient
}

export function useDockviewWorkspace({ client = dockviewWorkspaceClient }: UseDockviewWorkspaceOptions = {}) {
  const workspaceClientRef = useRef(client)
  const dockviewApiRef = useRef<DockviewApi | null>(null)
  const dockviewContainerRef = useRef<HTMLDivElement | null>(null)
  const initialWorkspaceStateRef = useRef<PersistedDockviewWorkspaceState | null>(
    workspaceClientRef.current.readState(),
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
  const dockviewPersistenceBindingsRef = useRef<DockviewWorkspaceBinding[]>([])

  const updateWorkspaceTabs = (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => {
    const nextTabs = updater(workspaceTabsRef.current)
    workspaceTabsRef.current = nextTabs
    setWorkspaceTabs(nextTabs)
  }

  const activateWorkspace = (workspaceId: number) => {
    activeWorkspaceIdRef.current = workspaceId
    setActiveWorkspaceId(workspaceId)
  }

  const disposeDockviewPersistenceBindings = () => {
    disposeDockviewWorkspaceBindings(dockviewPersistenceBindingsRef.current)
    dockviewPersistenceBindingsRef.current = []
  }

  const syncDockviewLayout = () => {
    syncDockviewWorkspaceLayout(dockviewApiRef.current, dockviewContainerRef.current)
  }

  const scheduleDockviewLayoutSync = () => {
    scheduleDockviewWorkspaceLayoutSync(syncDockviewLayout)
  }

  const persistCurrentWorkspaceSnapshot = () => {
    const api = dockviewApiRef.current

    if (!api) {
      return
    }

    const activeId = activeWorkspaceIdRef.current
    const nextSnapshot = captureDockviewWorkspaceSnapshot(api)

    updateWorkspaceTabs((tabs) => writeDockviewWorkspaceSnapshot(tabs, activeId, nextSnapshot))
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
    dockviewPersistenceBindingsRef.current = bindDockviewWorkspacePersistence(
      api,
      schedulePersistCurrentWorkspaceSnapshot,
    )
  }

  const restoreWorkspaceSnapshot = (workspaceId: number) => {
    const api = dockviewApiRef.current

    if (!api) {
      return
    }

    applyDockviewWorkspaceSnapshot(api, readDockviewWorkspaceSnapshot(workspaceTabsRef.current, workspaceId))
    scheduleDockviewLayoutSync()
  }

  const handleSelectWorkspace = (workspaceId: number) => {
    selectDockviewWorkspace({
      currentActiveWorkspaceId: activeWorkspaceIdRef.current,
      nextWorkspaceId: workspaceId,
      persistCurrentWorkspaceSnapshot,
      restoreWorkspaceSnapshot,
      setActiveWorkspaceId: activateWorkspace,
    })
  }

  const handleAddWorkspace = () => {
    addDockviewWorkspace({
      persistCurrentWorkspaceSnapshot,
      restoreWorkspaceSnapshot,
      setActiveWorkspaceId: activateWorkspace,
      updateWorkspaceTabs,
      workspaceTabs: workspaceTabsRef.current,
    })
  }

  const handleDockviewReady = (event: DockviewReadyEvent) => {
    const api = event.api
    dockviewApiRef.current = api
    bindDockviewPersistence(api)

    const readyState = resolveDockviewWorkspaceReadyState({
      activeWorkspaceId: activeWorkspaceIdRef.current,
      api,
      hasPersistedWorkspaceState: Boolean(initialWorkspaceStateRef.current),
      workspaceTabs: workspaceTabsRef.current,
    })

    if (readyState.type === 'seeded-default') {
      updateWorkspaceTabs((tabs) =>
        writeDockviewWorkspaceSnapshot(tabs, DEFAULT_ACTIVE_WORKSPACE_ID, readyState.snapshot),
      )
    }

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
    workspaceClientRef.current.writeState({
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
