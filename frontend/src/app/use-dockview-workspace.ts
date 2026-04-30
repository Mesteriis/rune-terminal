import { useEffect, useRef, useState } from 'react'
import { type DockviewApi, type DockviewReadyEvent } from 'dockview-react'

import { type WorkspaceWidgetKindCatalogEntry } from '@/shared/api/workspace'
import { setActiveDockviewApi } from '@/shared/model/dockview-api-registry'
import {
  addDockviewWorkspace,
  deleteDockviewWorkspace,
  renameDockviewWorkspace,
  selectDockviewWorkspace,
} from './dockview-workspace.actions'
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
  widgetCatalogEntries?: WorkspaceWidgetKindCatalogEntry[]
}

/** Orchestrates workspace tabs, Dockview startup, and pluggable snapshot persistence. */
export function useDockviewWorkspace({
  client = dockviewWorkspaceClient,
  widgetCatalogEntries,
}: UseDockviewWorkspaceOptions = {}) {
  const workspaceClientRef = useRef(client)
  const dockviewApiRef = useRef<DockviewApi | null>(null)
  const dockviewContainerRef = useRef<HTMLDivElement | null>(null)
  const initialWorkspaceStateRef = useRef<PersistedDockviewWorkspaceState | null>(
    workspaceClientRef.current.readState(),
  )
  const initialWorkspaceTabs = initialWorkspaceStateRef.current?.workspaceTabs ?? createDefaultWorkspaceTabs()
  const initialActiveWorkspaceId =
    initialWorkspaceStateRef.current?.activeWorkspaceId ?? DEFAULT_ACTIVE_WORKSPACE_ID
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceLayoutTab[]>(initialWorkspaceTabs)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialActiveWorkspaceId)
  const workspaceTabsRef = useRef<WorkspaceLayoutTab[]>(initialWorkspaceTabs)
  const activeWorkspaceIdRef = useRef(initialActiveWorkspaceId)
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

  useEffect(() => () => setActiveDockviewApi(null), [])

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

  const handleRenameWorkspace = (workspaceId: number, title: string) => {
    renameDockviewWorkspace({
      title,
      updateWorkspaceTabs,
      workspaceId,
    })
  }

  const handleDeleteWorkspace = (workspaceId: number) => {
    deleteDockviewWorkspace({
      activeWorkspaceId: activeWorkspaceIdRef.current,
      persistCurrentWorkspaceSnapshot,
      restoreWorkspaceSnapshot,
      setActiveWorkspaceId: activateWorkspace,
      updateWorkspaceTabs,
      workspaceId,
      workspaceTabs: workspaceTabsRef.current,
    })
  }

  const handleDockviewReady = (event: DockviewReadyEvent) => {
    const api = event.api
    dockviewApiRef.current = api
    setActiveDockviewApi(api)
    dockviewPersistenceController.bind(api)

    const readyState = resolveDockviewWorkspaceReadyState({
      activeWorkspaceId: activeWorkspaceIdRef.current,
      api,
      hasPersistedWorkspaceState: Boolean(initialWorkspaceStateRef.current),
      widgetCatalogEntries,
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
    handleDeleteWorkspace,
    handleDockviewReady,
    handleRenameWorkspace,
    handleSelectWorkspace,
  }
}
