import { useRef, useState } from 'react'
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
  createDockviewWorkspacePersistenceController,
  scheduleDockviewWorkspaceLayoutSync,
  syncDockviewWorkspaceLayout,
  type DockviewWorkspacePersistenceController,
} from './dockview-workspace.runtime'
import { resolveDockviewWorkspaceReadyState } from './dockview-workspace.ready'
import {
  applyDockviewWorkspaceSnapshot,
  captureDockviewWorkspaceSnapshot,
  readDockviewWorkspaceSnapshot,
  writeDockviewWorkspaceSnapshot,
} from './dockview-workspace.snapshots'
import { useDockviewWorkspaceEffects } from './use-dockview-workspace-effects'

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
  const dockviewPersistenceControllerRef = useRef<DockviewWorkspacePersistenceController | null>(null)

  const updateWorkspaceTabs = (updater: (tabs: WorkspaceLayoutTab[]) => WorkspaceLayoutTab[]) => {
    const nextTabs = updater(workspaceTabsRef.current)
    workspaceTabsRef.current = nextTabs
    setWorkspaceTabs(nextTabs)
  }

  const activateWorkspace = (workspaceId: number) => {
    activeWorkspaceIdRef.current = workspaceId
    setActiveWorkspaceId(workspaceId)
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

  if (!dockviewPersistenceControllerRef.current) {
    dockviewPersistenceControllerRef.current = createDockviewWorkspacePersistenceController({
      debounceMs: DOCKVIEW_PERSIST_DEBOUNCE_MS,
      onPersistWorkspaceSnapshot: persistCurrentWorkspaceSnapshot,
    })
  }

  const dockviewPersistenceController = dockviewPersistenceControllerRef.current

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
    dockviewPersistenceController.bind(api)

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

  useDockviewWorkspaceEffects({
    activeWorkspaceId,
    dockviewContainerRef,
    dockviewPersistenceController,
    syncDockviewLayout,
    workspaceClientRef,
    workspaceTabs,
  })

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
