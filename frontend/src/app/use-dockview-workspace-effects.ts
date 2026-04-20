import { useEffect, type MutableRefObject } from 'react'

import { type DockviewWorkspaceClient } from './dockview-workspace.client'
import { type WorkspaceLayoutTab } from './dockview-workspace.persistence'
import { type DockviewWorkspacePersistenceController } from './dockview-workspace.runtime'

type UseDockviewWorkspaceEffectsOptions = {
  activeWorkspaceId: number
  dockviewContainerRef: MutableRefObject<HTMLDivElement | null>
  dockviewPersistenceController: DockviewWorkspacePersistenceController
  syncDockviewLayout: () => void
  workspaceClientRef: MutableRefObject<DockviewWorkspaceClient>
  workspaceTabs: WorkspaceLayoutTab[]
}

export function useDockviewWorkspaceEffects({
  activeWorkspaceId,
  dockviewContainerRef,
  dockviewPersistenceController,
  syncDockviewLayout,
  workspaceClientRef,
  workspaceTabs,
}: UseDockviewWorkspaceEffectsOptions) {
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
      dockviewPersistenceController.dispose()
    }
  }, [])
}
