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
    const abortController = new AbortController()

    fetchWorkspaceWidgetKindCatalog(abortController.signal)
      .then((entries) => {
        if (abortController.signal.aborted) {
          return
        }

        setState({
          entries,
          status: 'ready',
        })
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return
        }

        setState({
          entries: [],
          errorMessage: error instanceof Error ? error.message : 'Workspace widget catalog unavailable',
          status: 'error',
        })
      })

    return () => {
      abortController.abort()
    }
  }, [])

  return state
}
