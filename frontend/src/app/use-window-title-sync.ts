import { useEffect } from 'react'

import type { WorkspaceLayoutTab } from './dockview-workspace.persistence'

const PRODUCT_LABEL = 'RunaTerminal'

function resolveAutoTitle(
  activeWorkspaceId: number,
  workspaceTabs: WorkspaceLayoutTab[],
  fallbackAutoTitle: string,
) {
  const activeWorkspace = workspaceTabs.find((workspace) => workspace.id === activeWorkspaceId)
  const title = activeWorkspace?.title?.trim() || fallbackAutoTitle.trim()

  if (!title) {
    return PRODUCT_LABEL
  }

  return `${title} · ${PRODUCT_LABEL}`
}

export function useWindowTitleSync(input: {
  activeWorkspaceId: number
  autoTitle: string
  customTitle: string
  mode: 'auto' | 'custom'
  workspaceTabs: WorkspaceLayoutTab[]
}) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const nextTitle =
      input.mode === 'custom' && input.customTitle.trim()
        ? input.customTitle.trim()
        : resolveAutoTitle(input.activeWorkspaceId, input.workspaceTabs, input.autoTitle)

    document.title = nextTitle
  }, [input.activeWorkspaceId, input.autoTitle, input.customTitle, input.mode, input.workspaceTabs])
}
