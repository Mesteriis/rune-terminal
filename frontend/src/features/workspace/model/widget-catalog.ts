import { useEffect, useState } from 'react'

import { fetchWorkspaceWidgetKindCatalog, type WorkspaceWidgetKindCatalogEntry } from '@/shared/api/workspace'

export type WorkspaceWidgetCatalogStatus = 'loading' | 'ready' | 'error'

export type WorkspaceWidgetCatalogState = {
  entries: WorkspaceWidgetKindCatalogEntry[]
  status: WorkspaceWidgetCatalogStatus
  errorMessage?: string
}

export function getWorkspaceWidgetKindEntry(
  entries: WorkspaceWidgetKindCatalogEntry[] | undefined,
  kind: string,
) {
  return entries?.find((entry) => entry.kind === kind)
}

export function isWorkspaceWidgetKindCreatable(
  entries: WorkspaceWidgetKindCatalogEntry[] | undefined,
  kind: string,
) {
  const entry = getWorkspaceWidgetKindEntry(entries, kind)

  return Boolean(entry?.status === 'available' && entry.runtime_owned && entry.can_create)
}

export function isWorkspaceWidgetKindFrontendLocal(
  entries: WorkspaceWidgetKindCatalogEntry[] | undefined,
  kind: string,
) {
  const entry = getWorkspaceWidgetKindEntry(entries, kind)

  return Boolean(entry?.status === 'frontend-local' && !entry.runtime_owned)
}

export function useWorkspaceWidgetCatalog(): WorkspaceWidgetCatalogState {
  const [state, setState] = useState<WorkspaceWidgetCatalogState>({
    entries: [],
    status: 'loading',
  })

  useEffect(() => {
    let isCancelled = false

    fetchWorkspaceWidgetKindCatalog()
      .then((entries) => {
        if (isCancelled) {
          return
        }

        setState({
          entries,
          status: 'ready',
        })
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setState({
          entries: [],
          errorMessage: error instanceof Error ? error.message : 'Workspace widget catalog unavailable',
          status: 'error',
        })
      })

    return () => {
      isCancelled = true
    }
  }, [])

  return state
}
